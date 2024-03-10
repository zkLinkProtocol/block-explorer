import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsSelect, MoreThanOrEqual, Brackets } from "typeorm";
import { Pagination } from "nestjs-typeorm-paginate";
import { IPaginationOptions } from "../common/types";
import { paginate } from "../common/utils";
import { Token as DbToken, ETH_TOKEN } from "./token.entity";
import tokens from "./tokens";

export interface FilterTokensOptions {
  minLiquidity?: number;
  networkKey?: string;
}

export interface TokenL1Address {
  chain: string,
  l1Address: string,
  l2Address: string,
}
export interface Token {
  address: TokenL1Address[];
  symbol: string;
  decimals: number;
  cgPriceId: string;
  type: string;
  yieldType: string[];
  multiplier: number;
}


@Injectable()
export class TokenService {
  private supportTokens: Token[];
  constructor(
    @InjectRepository(DbToken)
    private readonly tokenRepository: Repository<DbToken>
  ) {
    this.supportTokens = [];
    tokens.forEach(token => {
      this.supportTokens.push(token);
    });
  }

  public getAllSupportTokens(): Token[] {
    return this.supportTokens;
  }

  public async findOne(address: string, fields?: FindOptionsSelect<DbToken>): Promise<DbToken> {
    const token = await this.tokenRepository.findOne({
      where: [{
        l2Address: address,
      },{
        l1Address: address,
      }],
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
  ): Promise<Pagination<DbToken>> {
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
    return await paginate<DbToken>(queryBuilder, paginationOptions);
  }
}
