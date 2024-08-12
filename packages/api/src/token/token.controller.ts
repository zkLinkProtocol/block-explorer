import { Controller, Get, Param, NotFoundException, Query, Post, HttpCode, Req } from "@nestjs/common";
import {
  ApiTags,
  ApiParam,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiExcludeController,
  ApiQuery,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from "@nestjs/swagger";
import { Pagination } from "nestjs-typeorm-paginate";
import { PagingOptionsDto, PagingOptionsWithMaxItemsLimitDto } from "../common/dtos";
import { ApiListPageOkResponse } from "../common/decorators/apiListPageOkResponse";
import { TokenService } from "./token.service";
import { TransferService } from "../transfer/transfer.service";
import { MonitorHistory, TokenBalance, TokenDto } from "./token.dto";
import { TransferDto } from "../transfer/transfer.dto";
import { ParseLimitedIntPipe } from "../common/pipes/parseLimitedInt.pipe";
import { ParseAddressPipe, ADDRESS_REGEX_PATTERN } from "../common/pipes/parseAddress.pipe";
import { swagger } from "../config/featureFlags";
import { constants } from "../config/docs";
import { BigNumber, ethers } from "ethers";
import { normalizeAddressTransformer } from "src/common/transformers/normalizeAddress.transformer";
import { LRUCache } from "lru-cache";
import { getHistoryTokenList } from "../configureApp";
import * as fs from "fs";
import * as path from "path";
import {DateDto} from "../common/dtos/date.dto";

const options = {
  // how long to live in ms
  ttl: 1000 * 60 * 60,
  // return stale items before removing from cache?
  allowStale: false,
  ttlAutopurge: true,
};

const cache = new LRUCache(options);

const entityName = "tokens";

@ApiTags("Token BFF")
@ApiExcludeController(!swagger.bffEnabled)
@Controller(entityName)
export class TokenController {
  constructor(private readonly tokenService: TokenService, private readonly transferService: TransferService) {}

  @Get("")
  @ApiListPageOkResponse(TokenDto, { description: "Successfully returned token list" })
  @ApiBadRequestResponse({ description: "Paging query params are not valid or out of range" })
  @ApiQuery({
    name: "minLiquidity",
    type: "integer",
    description: "Min liquidity filter",
    example: 100000,
    required: false,
  })
  public async getTokens(
    @Query() pagingOptions: PagingOptionsDto,
    @Query("minLiquidity", new ParseLimitedIntPipe({ min: 0, isOptional: true })) minLiquidity?: number,
    @Query("key") key?: string
  ): Promise<Pagination<TokenDto>> {
    if (key === "") {
      key = undefined;
    }
    const res = await this.tokenService.findAll(
      {
        minLiquidity,
        networkKey: key,
      },
      {
        filterOptions: { minLiquidity },
        ...pagingOptions,
        route: entityName,
      }
    );
    return {
      ...res,
      items: res.items.map((token) => {
        let price_t = 6;
        if (token.usdPrice <= 0) {
          price_t = 0;
        }
        if (token.usdPrice < 1) {
          let priceNum = token.usdPrice;
          let num = 0;
          while(priceNum<1 && priceNum > 0){
            priceNum *= 10;
            num++;
          }
          price_t = price_t + num;
        } else {
          if (token.usdPrice * 10 ** price_t >= Number.MAX_SAFE_INTEGER) {
            price_t = 0;
          }
        }
        return {
          ...token,
          tvl: token.totalSupply
            .mul(Math.floor((token.usdPrice ?? 0) * 10 ** price_t))
            .div(BigNumber.from(10).pow(price_t))
            .div(BigNumber.from(10).pow(token.decimals))
            .toString(),
        };
      }),
    };
  }
  @Post("/deposit-highest-tvl-record")
  @ApiOperation({ summary: 'Get deposit tx highest TVL record', description: 'Only based on the address, check if there is any deposit transaction for the user where the deposit token value is at least $20. If such a condition is met, return true. The token price is updated every hour.'})
  @ApiBody({ 
    description: 'The payload data', 
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: "User's EVM address in lowercase", example:"0x9FA3b1D0D516E92b7576AC9DD2Ed8f9d3Fc34e27" },
        twitter: { type: 'string', description: 'Twitter account ID' , example:""},
        discord: { type: 'string', description: 'Discord username' ,example:""},
        telegram: { type: 'string', description: 'Telegram user ID' ,example:""},
        email: { type: 'string', description: 'Email address' ,example:""},
      },
    },
  })
  @ApiResponse({ status: 200, description: 'This API always return status code 200' })
  @HttpCode(200)
  public async getDepositTransferHighestTvlRecordPost(@Req() req: any): Promise<any> {
    const { address, twitter, discord, telegram, email } = req.body;
    
    try {
      const checkedAddr = getChecksumAddress(address);
      return {
        error: {
          code: 0,
          message: "",
        },
        data: {
          //TODO check if the user has a deposit transaction where the deposit token value is at least $20
          // but it should be more flexible and support custom input quantities.
          result: (await this.tokenService.getUserHighestDepositTvl(checkedAddr)).gte(19),
        },
      };
    } catch (e) {
      return {
        error: {
          code: 1,
          message: e.message,
        },
        data: {
          result: false,
        },
      };
    }
  }

  @Get("/tvl")
  @ApiParam({
    name: "iall",
    example: true,
    description: "Boolean value as string",
  })
  @ApiListPageOkResponse(TokenDto, { description: "Successfully returned all tokens" })
  @ApiBadRequestResponse({ description: "Paging query params are not valid or out of range" })
  public async getAllTokens(@Query("isall") isall: boolean): Promise<TokenDto[]> {
    return await this.tokenService.calculateTvl(isall === false);
  }

  @ApiOperation({ summary: "Tokens that support the balance ranking" })
  @Get("/list")
  public async getValidTokens(): Promise<TokenDto[]> {
    const result = await this.tokenService.usdPriceNotNullTokens();
    return result.map((token) => {
      return {
        l2Address: token.l2Address,
        l1Address: token.l1Address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        usdPrice: token.usdPrice,
        iconURL: token.iconURL,
        totalSupply: token.totalSupply,
      };
    });
  }

  @ApiOperation({
    summary: "token balance ranking, paging support, the cache time is one hour",
  })
  @ApiBadRequestResponse({ description: "Token address is invalid" })
  @ApiNotFoundResponse({ description: "Token with the specified address does not exist" })
  @Get("/balance/list")
  public async getBalanceList(
    @Query() pagingOptions: PagingOptionsDto,
    @Query("tokenAddress", new ParseAddressPipe()) tokenAddress: string
  ): Promise<TokenBalance[]> {
    const token = await this.tokenService.findOne(tokenAddress);
    if (!token) {
      throw new NotFoundException();
    }

    const cacheKey = `TOKEN_BAL_${tokenAddress}_${pagingOptions.page}_${pagingOptions.limit}`;
    const cacheResult = cache.get(cacheKey) as TokenBalance[];
    if (cacheResult) {
      return cacheResult;
    }

    const result = await this.tokenService.getBalanceRankByToken(tokenAddress, pagingOptions.page, pagingOptions.limit);
    const tokenBals = result.map((bal) => {
      const balance = BigNumber.from(bal.balanceNum).div(BigNumber.from(10).pow(token.decimals)).toString();
      let balanceDeciaml= BigNumber.from(bal.balanceNum).mod(BigNumber.from(10).pow(token.decimals)).toString();
      if (!balanceDeciaml.startsWith('0')){
        while (balanceDeciaml.length < token.decimals){
          balanceDeciaml = '0' + balanceDeciaml;
        }
      }
      return {
        balance:balance+'.'+balanceDeciaml,
        address: normalizeAddressTransformer.from(bal.address),
      };
    });

    cache.set(cacheKey, tokenBals);
    return tokenBals;
  }

  @ApiOperation({
    summary: "token history balance ranking, run when utc 1 am everyday",
  })
  @ApiBadRequestResponse({ description: "Token address is invalid" })
  @ApiNotFoundResponse({ description: "Token with the specified address does not exist" })
  @Get("/historyBalance/list")
  public async getHistoryBalanceList(
      @Query("tokenAddress", new ParseAddressPipe()) tokenAddress: string,
      @Query() lookTime: DateDto,
  ): Promise<TokenBalance[]> {
    const token = await this.tokenService.findOne(tokenAddress);
    if (!token) {
      throw new NotFoundException();
    }
    const historyTokenList =  await getHistoryTokenList();
    let time: Date ;
    if (lookTime.date && !isNaN(new Date(lookTime.date).getTime())){
      time = new Date(lookTime.date);
    }else {
      throw new NotFoundException("Invalid date format, file will not found ");
    }
    const timeStr = time.getFullYear()+'-'+(time.getMonth()+1)+'-'+time.getDate();
    const historyToken = historyTokenList.find((r) => r.address === tokenAddress);
    if ( historyToken ){
      try {
        const filePath = path.join(__dirname, '../../historyTokenJson/'+historyToken.name+'-'+timeStr+'.json');
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data);
      } catch (err) {
        throw new NotFoundException("the json file "+ historyToken.name+'-'+timeStr+'.json' +" read failed ");
      }
    }else {
     throw new NotFoundException("this token "+tokenAddress+" now is not supply ");
    }
  }

  @Get("/zkl/circulating")
  @ApiListPageOkResponse(TokenDto, { description: "Successfully returned zkLink token liquidity" })
  @ApiBadRequestResponse({ description: "failed found zkLink amount" })
  public async getZkLinkLiquidity(): Promise<string> {
    const cacheResult = cache.get("zkLinkAmount") as string;
    if (cacheResult) {
      return cacheResult;
    }
    const ans =  await this.tokenService.getZkLinkLiquidityAmount();
    cache.set("zkLinkAmount",ans);
    return ans;
  }

  @ApiOperation({
    summary: "ZKL token hold monitor",
  })
  @ApiBadRequestResponse({ description: "Api error" })
  @ApiNotFoundResponse({ description: "monitor now does not have data" })
  @Get("/monitor/list")
  public async getMonitorList(
  ) {
    const cacheResult = cache.get("Monitor") as MonitorHistory[];
    if (cacheResult) {
      return cacheResult;
    }
    const everyDayMonitorList = await this.tokenService.getMonitorList();
    const ans = everyDayMonitorList.map((t) =>{
      return {
        ...t,
        address: normalizeAddressTransformer.from(t.address)
      }
    });
    cache.set("Monitor",ans);
    return ans;
  }

  @Get("/market/kine")
  public async getMarketKine(
      @Query("category") category : string,
      @Query("symbol") symbol: string,
      @Query("interval") interval: string,
      @Query("start") start?: string,
      @Query("end") end?: string,
      @Query("limit") limit?: string
  ): Promise<string> {
    const res = await this.tokenService.getFetchKlineData(category,symbol,interval,start,end,limit);
    if (res === undefined || (typeof res === "string"&& res === 'error')){
      return "get kine data error, check network and parameter";
    }
    return res.map((individuales) => {
      return {
        startTime: new Date(Number(individuales[0])).toISOString(),
        openPrice: individuales[1],
        highestPrice: individuales[2],
        lowestPrice: individuales[3],
        closePrice: individuales[4],
        volume: individuales[5],
        turnover: individuales[6]
      }
    });
  }

  @Get(":address")
  @ApiParam({
    name: "address",
    schema: { pattern: ADDRESS_REGEX_PATTERN },
    example: constants.tokenAddress,
    description: "Valid hex address",
  })
  @ApiOkResponse({ description: "Token was returned successfully", type: TokenDto })
  @ApiBadRequestResponse({ description: "Token address is invalid" })
  @ApiNotFoundResponse({ description: "Token with the specified address does not exist" })
  public async getToken(@Param("address", new ParseAddressPipe()) address: string): Promise<TokenDto> {
    const token = await this.tokenService.findOne(address);
    if (!token) {
      throw new NotFoundException();
    }
    return token;
  }

  @Get(":address/transfers")
  @ApiParam({
    name: "address",
    schema: { pattern: ADDRESS_REGEX_PATTERN },
    example: constants.tokenAddress,
    description: "Valid hex address",
  })
  @ApiListPageOkResponse(TransferDto, { description: "Successfully returned token transfers list" })
  @ApiBadRequestResponse({
    description: "Token address is invalid or paging query params are not valid or out of range",
  })
  @ApiNotFoundResponse({ description: "Token with the specified address does not exist" })
  public async getTokenTransfers(
    @Param("address", new ParseAddressPipe()) address: string,
    @Query() pagingOptions: PagingOptionsWithMaxItemsLimitDto
  ): Promise<Pagination<TransferDto>> {
    if (!(await this.tokenService.exists(address))) {
      throw new NotFoundException();
    }

    return await this.transferService.findAll(
      {
        tokenAddress: address,
        isFeeOrRefund: false,
      },
      {
        ...pagingOptions,
        route: `${entityName}/${address}/transfers`,
      }
    );
  }
}

function getChecksumAddress(address: string): string {
  if (!ethers.utils.isHexString(address, 20)) {
    throw new Error("invalid address");
  }

  address = address.toLowerCase();

  const chars = address.substring(2).split("");

  const expanded = new Uint8Array(40);
  for (let i = 0; i < 40; i++) {
    expanded[i] = chars[i].charCodeAt(0);
  }

  const hashed = ethers.utils.arrayify(ethers.utils.keccak256(expanded));

  for (let i = 0; i < 40; i += 2) {
    if (hashed[i >> 1] >> 4 >= 8) {
      chars[i] = chars[i].toUpperCase();
    }
    if ((hashed[i >> 1] & 0x0f) >= 8) {
      chars[i + 1] = chars[i + 1].toUpperCase();
    }
  }

  return "0x" + chars.join("");
}
