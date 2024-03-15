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
import { TokenDto } from "./token.dto";
import { TransferDto } from "../transfer/transfer.dto";
import { ParseLimitedIntPipe } from "../common/pipes/parseLimitedInt.pipe";
import { ParseAddressPipe, ADDRESS_REGEX_PATTERN } from "../common/pipes/parseAddress.pipe";
import { swagger } from "../config/featureFlags";
import { constants } from "../config/docs";
import { BigNumber, ethers } from "ethers";

const entityName = "tokens";

@ApiTags("Token BFF")
@ApiExcludeController(!swagger.bffEnabled)
@Controller(entityName)
export class TokenController {
  constructor(private readonly tokenService: TokenService, private readonly transferService: TransferService) {}

  @Get("/valid/checkExistDeposit")
  @ApiOperation({ summary: "Check whether the address has a deposit transaction" })
  public async getCheckExistDeposit(@Query("address", new ParseAddressPipe()) address: string) {
    const exist = await this.tokenService.checkExistDeposit(address);
    return {
      result: exist,
    };
  }

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
        return {
          ...token,
          tvl: token.totalSupply
            .mul(Math.floor((token.usdPrice ?? 0) * 10 ** 6))
            .div(10 ** 6)
            .div(BigNumber.from(10).pow(token.decimals))
            .toString(),
        };
      }),
    };
  }
  @Post("/deposit-highest-tvl-record")
  @ApiOperation({
    summary: "Get deposit tx highest TVL record",
    description:
      "Only based on the address, check if there is any deposit transaction for the user where the deposit token value is at least $20. If such a condition is met, return true. The token price is updated every hour.",
  })
  @ApiBody({
    description: "The payload data",
    schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "User's EVM address in lowercase",
          example: "0x9FA3b1D0D516E92b7576AC9DD2Ed8f9d3Fc34e27",
        },
        twitter: { type: "string", description: "Twitter account ID", example: "" },
        discord: { type: "string", description: "Discord username", example: "" },
        telegram: { type: "string", description: "Telegram user ID", example: "" },
        email: { type: "string", description: "Email address", example: "" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "This API always return status code 200" })
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
