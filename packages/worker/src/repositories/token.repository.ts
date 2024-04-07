import { Injectable } from "@nestjs/common";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { IsNull, Not, FindOptionsSelect } from "typeorm";
import { Token } from "../entities";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { BigNumber } from "ethers";

@Injectable()
export class TokenRepository extends BaseRepository<Token> {
  public constructor(unitOfWork: UnitOfWork) {
    super(Token, unitOfWork);
  }

  public override async upsert(addressDto: QueryDeepPartialEntity<Token>): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const queryBuilder = transactionManager.createQueryBuilder().insert();
    queryBuilder.into(this.entityTarget);
    queryBuilder.values(addressDto);
    queryBuilder.onConflict(`("l2Address") DO UPDATE 
        SET 
          "updatedAt" = CURRENT_TIMESTAMP,
          symbol = EXCLUDED.symbol,
          name = EXCLUDED.name,
          decimals = EXCLUDED.decimals,
          "blockNumber" = EXCLUDED."blockNumber",
          "l1Address" = EXCLUDED."l1Address",
          "transactionHash" = EXCLUDED."transactionHash",
          "logIndex" = EXCLUDED."logIndex",
          "networkKey" = EXCLUDED."networkKey"
        WHERE 
          tokens."blockNumber" IS NULL OR
          EXCLUDED."blockNumber" > tokens."blockNumber" OR 
          (EXCLUDED."blockNumber" = tokens."blockNumber" AND EXCLUDED."logIndex" > tokens."logIndex")
      `);
    await queryBuilder.execute();
  }

  public async getOffChainDataLastUpdatedAt(): Promise<Date> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const token = await transactionManager.findOne(this.entityTarget, {
      where: {
        offChainDataUpdatedAt: Not(IsNull()),
      },
      select: {
        offChainDataUpdatedAt: true,
      },
      order: {
        offChainDataUpdatedAt: "DESC",
      },
    });
    return token?.offChainDataUpdatedAt;
  }

  public async getBridgedTokens(fields: FindOptionsSelect<Token> = { l1Address: true }): Promise<Token[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const tokens = await transactionManager.find(this.entityTarget, {
      where: {
        l1Address: Not(IsNull()),
      },
      select: fields,
    });
    return tokens;
  }

  public async getTotalTVL(): Promise<BigNumber> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const allTokens = await transactionManager.find(this.entityTarget);
    let totalTVL = BigNumber.from(0);
    for (const token of allTokens) {
      if (token.l1Address === null){
        continue;
      }
      let tvl = BigNumber.from(token.totalSupply)
        .mul(((token.usdPrice ?? 0) * 1000) | 0)
        .div(1000)
        .div(BigNumber.from(10).pow(token.decimals));

      totalTVL = totalTVL.add(tvl);
    }
    return totalTVL;
  }

  public async updateTokenOffChainData({
    l1Address,
    l2Address,
    liquidity,
    usdPrice,
    updatedAt,
    iconURL,
  }: {
    l1Address?: string;
    l2Address?: string;
    liquidity?: number;
    usdPrice?: number;
    updatedAt?: Date;
    iconURL?: string;
  }): Promise<void> {
    if (!l1Address && !l2Address) {
      throw new Error("l1Address or l2Address must be provided");
    }
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update(
      this.entityTarget,
      {
        ...(l1Address ? { l1Address } : { l2Address }),
      },
      {
        liquidity,
        usdPrice,
        offChainDataUpdatedAt: updatedAt,
        ...(iconURL && {
          iconURL,
        }),
      }
    );
  }

  public async updateTokenTotalSupply({
    l2Address,
    totalSupply,
  }: {
    l2Address?: string;
    totalSupply: BigNumber;
  }): Promise<void> {
    if (!l2Address) {
      throw new Error("l2Address must be provided");
    }
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update(
      this.entityTarget,
      {
        l2Address,
      },
      {
        totalSupply,
      }
    );
  }
}
