import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsSelect, MoreThanOrEqual, Brackets } from "typeorm";
import { Pagination } from "nestjs-typeorm-paginate";
import { IPaginationOptions } from "../common/types";
import { paginate } from "../common/utils";
import { Token, ETH_TOKEN } from "./token.entity";
import { BigNumber, ethers } from "ethers";
import { LRUCache } from "lru-cache";
import { Transfer } from "../transfer/transfer.entity";
import {contain} from "echarts/types/src/scale/helper";

// const options: LRU. = { max: 500 };
const options = {
  // how long to live in ms
  ttl: 1000 * 5,
  // return stale items before removing from cache?
  allowStale: false,
  ttlAutopurge: true,
};

const cache = new LRUCache(options);

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
    @InjectRepository(Transfer)
    private readonly transferRepository: Repository<Transfer>,
  ) {}

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
    const value7DaysWithdrawalTransfer = await this.getLast7DaysWithdrawalTransferAmount()
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
      if (!token.isExcludedTVL){
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
    const sevenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const tokenAddress = Buffer.from("000000000000000000000000000000000000800A", 'hex');

    const res = await this.transferRepository.createQueryBuilder("transfer")
        .select("SUM(CAST(transfer.amount AS NUMERIC))", "totalAmount")
        .where("transfer.type = :type", { type: "withdrawal" })
        .andWhere("transfer.timestamp >= :timestamp", { timestamp: sevenDaysAgo })
        .andWhere("transfer.tokenAddress = :tokenAddress", { tokenAddress: tokenAddress })
        .getRawOne();
    if (res.totalAmount === null || res.totalAmount === undefined){
        return BigNumber.from(0);
    }
    return BigNumber.from(res.totalAmount);
    }
}
