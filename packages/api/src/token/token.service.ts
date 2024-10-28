import {Injectable, Logger, Query} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { HttpService } from "@nestjs/axios";
import { Repository, FindOptionsSelect, MoreThanOrEqual, Brackets, IsNull, Not } from "typeorm";
import { Pagination } from "nestjs-typeorm-paginate";
import { IPaginationOptions } from "../common/types";
import { paginate } from "../common/utils";
import { Token, ETH_TOKEN } from "./token.entity";
import { BigNumber, ethers } from "ethers";
import { LRUCache } from "lru-cache";
import { Balance } from "src/balance/balance.entity";
import { normalizeAddressTransformer } from "src/common/transformers/normalizeAddress.transformer";
import { withdrawalTransferAmountSQLName } from "../historyToken/SQLqueries.service";
import { FetSqlRecordStatus } from "../historyToken/entities/fetSqlRecordStatus.entity";
import { timeLineSupplyCirculatingList } from "./timeLineSupplyCirculatingList";
import { MonitAddressHistory } from "../historyToken/entities/monitAddressHistory.entity";
import { firstValueFrom } from "rxjs";
import { MonitAddressLast } from "../historyToken/entities/monitAddressLast.entity";

// const options: LRU. = { max: 500 };
const options = {
  // how long to live in ms
  ttl: 1000 * 60 * 5,
  // return stale items before removing from cache?
  allowStale: false,
  ttlAutopurge: true,
};

export const cache = new LRUCache(options);

export interface FilterTokensOptions {
  minLiquidity?: number;
  networkKey?: string;
}

const TVL_TOKEN: TokenTvl = {
  l2Address: "0x1TVLTVLTVLTVLTVLTVLTVLTVLTVLTVLTVLTVLTVL",
  l1Address: "0x0TVLTVLTVLTVLTVLTVLTVLTVLTVLTVLTVLTVLTVL",
  symbol: "__TVL__",
  name: "__TVL__",
  decimals: 18,
  iconURL: "",
  liquidity: 0,
  usdPrice: 0,
  tvl: "0",
} as TokenTvl;

export interface TokenTvl extends Token {
  tvl: string;
}

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    @InjectRepository(FetSqlRecordStatus)
    private readonly fetSqlRecordStatusRepository: Repository<FetSqlRecordStatus>,
    @InjectRepository(Balance)
    private readonly balanceRepository: Repository<Balance>,
    @InjectRepository(MonitAddressHistory)
    private readonly monitAddressHistoryRepository: Repository<MonitAddressHistory>,
    @InjectRepository(MonitAddressLast)
    private readonly monitAddressLastRepository: Repository<MonitAddressLast>,
    private readonly httpService: HttpService,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(TokenService.name);
  }


  public async findOne(address: string, fields?: FindOptionsSelect<Token>): Promise<Token> {
    const token = await this.tokenRepository.findOne({
      where: {
        l2Address: address,
      },
      select: fields,
    });
    if (!token && address.toLowerCase() === ETH_TOKEN.l2Address.toLowerCase()) {
      return ETH_TOKEN;
    }
    return token;
  }

  public async exists(address: string): Promise<boolean> {
    const tokenExists =
      (await this.tokenRepository.findOne({ where: { l2Address: address }, select: { l2Address: true } })) != null;
    if (!tokenExists && address === ETH_TOKEN.l2Address.toLowerCase()) {
      return true;
    }
    return tokenExists;
  }

  public async findAll(
    { minLiquidity, networkKey }: FilterTokensOptions,
    paginationOptions: IPaginationOptions
  ): Promise<Pagination<Token>> {
    const queryBuilder = this.tokenRepository.createQueryBuilder("token");
    if (networkKey) {
      queryBuilder.where(
        new Brackets((qb) =>
          qb.where("token.networkKey IS NULL").orWhere("token.networkKey = :networkKey", { networkKey: networkKey })
        )
      );
    }
    if (minLiquidity >= 0) {
      queryBuilder.andWhere({
        liquidity: MoreThanOrEqual(minLiquidity),
      });
    }
    queryBuilder.orderBy("token.liquidity", "DESC", "NULLS LAST");
    queryBuilder.addOrderBy("token.blockNumber", "DESC");
    queryBuilder.addOrderBy("token.logIndex", "DESC");
    return await paginate<Token>(queryBuilder, paginationOptions);
  }

  public async getUserHighestDepositTvl(address: string): Promise<BigNumber> {
    address=address.substring(2);
    const sql = `
    SELECT tokens."usdPrice", transfers.amount,
     transfers."tokenType", tokens.decimals
    FROM public.transfers
    LEFT JOIN tokens on transfers."tokenAddress" = tokens."l2Address"
    WHERE transfers.type='deposit' and transfers."from" = '\\x${address}'
  `;
    const res = await this.tokenRepository.query(sql);
    const a = res.map((item) =>
      BigNumber.from(item.amount)
        .mul(((item.usdPrice ?? 0) * 1000) | 0)
        .div(1000)
        .div(BigNumber.from(10).pow(item.decimals))
    ).sort((a, b) => (a.gt(b) ? -1 : 1));
    if (a.length === 0) {
      return BigNumber.from(0);
    }
    return a[0];
  }

  public async calculateTvl(onlyTotal = true): Promise<TokenTvl[]> {
    const tvl = cache.get("tvl");
    if (tvl) {
      if (onlyTotal) {
        return [tvl[(tvl as TokenTvl[]).length - 1]];
      }
      return tvl as TokenTvl[];
    }
    const tokens = await this.tokenRepository.find();
    let totalTvl = BigNumber.from(0);
    const value7DaysWithdrawalTransfer = await this.getLast7DaysWithdrawalTransferAmount();
    const ntvl = tokens.map((token) => {
      let tvl = BigNumber.from(0);
      if (token.isExternallyToken){
        tvl = tvl.add(BigNumber.from(token.totalSupply))
            .mul(((token.usdPrice ?? 0) * 1000) | 0)
            .div(1000)
            .div(BigNumber.from(10).pow(token.decimals));
      }else {
        if (token.l2Address.toLowerCase() === "0x000000000000000000000000000000000000800A".toLowerCase()) {
          tvl = tvl.add(BigNumber.from(token.totalSupply))
              .add(value7DaysWithdrawalTransfer)
              .mul(((token.usdPrice ?? 0) * 1000) | 0)
              .div(1000)
              .div(BigNumber.from(10).pow(token.decimals));
        }else {
          let price_t = 3;
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
          tvl = tvl.add(BigNumber.from(token.reserveAmount))
              .mul(((token.usdPrice ?? 0) * 10 ** price_t) | 0)
              .div(BigNumber.from(10).pow(price_t))
              .div(BigNumber.from(10).pow(token.decimals));
        }
      }
      if (!token.isExcludeTVL){
        totalTvl = totalTvl.add(tvl);
      }
      return {
        ...token,
        tvl: tvl.toString(),
      };
    });
    TVL_TOKEN.tvl = totalTvl.toString();
    ntvl.push(TVL_TOKEN);
    cache.set("tvl", ntvl);
    if (onlyTotal) {
      return [TVL_TOKEN];
    }
    return ntvl;
  }
  public async getLast7DaysWithdrawalTransferAmount(): Promise<BigNumber> {
    const record = await this.fetSqlRecordStatusRepository.query('SELECT "sourceSQLTableNumber", "sourceSQLValue" ' +
        'FROM public."fetSqlRecordStatus" ' +
        'where "fetSqlRecordStatus".name = \''+ withdrawalTransferAmountSQLName +'\' ;');
    let resFetSqlRecordStatus : FetSqlRecordStatus;
    if (record === null || record === undefined || record.length === 0){
      resFetSqlRecordStatus = null;
    }else {
      resFetSqlRecordStatus = record[0];
    }
    if (resFetSqlRecordStatus === null || resFetSqlRecordStatus === undefined){
      return BigNumber.from(0);
    }
    return BigNumber.from(resFetSqlRecordStatus.sourceSQLValue);
  }

  public async usdPriceNotNullTokens() {
    return await this.tokenRepository.findBy({
      usdPrice: Not(IsNull()),
    });
  }

  public async getBalanceRankByToken(
    tokenAddress: string,
    page: number,
    limit: number
  ): Promise<{ address: Buffer; balanceNum: string }[]> {
    return await this.balanceRepository.query(
      `
select address, "balanceNum" from
(select DISTINCT on (address) address, "balanceNum"  from  balances  where "tokenAddress" = $1 order by address, "blockNumber" desc) tmp order by "balanceNum" desc limit $2 offset $3`,
      [normalizeAddressTransformer.to(tokenAddress), limit, (page - 1) * limit]
    );
  }
  public async getAllBalanceByToken(
      tokenAddress: string,
  ): Promise<{ address: Buffer; balanceNum: string }[]> {
    return await this.balanceRepository.query(
        `
select address, "balanceNum" from
(select DISTINCT on (address) address, "balanceNum"  from  balances  where "tokenAddress" = $1 order by address, "blockNumber" desc) tmp order by "balanceNum" desc`,
        [normalizeAddressTransformer.to(tokenAddress)]
    );
  }

  public async getZkLinkLiquidityAmount(){
    const time = new Date();
    const dataLength = timeLineSupplyCirculatingList.length;
    for (let i = 1; i < dataLength; i++ ) {
      if (time < new Date(timeLineSupplyCirculatingList[i].date )) {
          return timeLineSupplyCirculatingList[ i - 1 ].value;
      }
    }
    return timeLineSupplyCirculatingList[ dataLength - 1 ].value;
  }

  public async getFetchKlineData(category : string, symbol: string, interval: string, start?: string, end?: string, limit?: string) {
    try {
      const response =await firstValueFrom(
          this.httpService.get('https://api.bybit.com/v5/market/kline', {
            params: {
              category: category,
              symbol: symbol,
              interval: interval,
              start: start,
              end: end,
              limit: limit
            },
          })
      );
      if (response.data.retMsg === 'OK'){
        return response.data.result.list;
      }
    } catch (error) {
      this.logger.error("bybit api error: ",error);
      return 'error';
    }
  }
  public async getMonitorList(){
    return await this.monitAddressHistoryRepository.query(`WITH RankedHistory AS (
        SELECT
        address,
        "zklAmount",
        change,
        "timestamp",
        network,
        owner,
        vested,
        type,
        ROW_NUMBER() OVER (
        PARTITION BY DATE_TRUNC('day', "timestamp"), address, owner, network
    ORDER BY "timestamp" DESC
  ) AS rn
    FROM
  public."monitAddressHistory"
  )
    SELECT
        address,
        "zklAmount",
        change,
        "timestamp",
        network,
        owner,
        vested,
        type
    FROM
    RankedHistory
    WHERE
    rn = 1;`);
  }

  public async getMonitLast(){
    return await this.monitAddressLastRepository.find({});
  }
}
