import { Injectable } from "@nestjs/common";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { IsNull, Not, FindOptionsSelect } from "typeorm";
import { Token } from "../entities";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import {ETH_TOKEN_L2_ADDRESS} from "../../../app/src/utils/constants";
import {ETH_ADDRESS} from "zksync-web3/build/src/utils";

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

  // public async saveETH(): Promise<void> {
  //   const transactionManager = this.unitOfWork.getTransactionManager();
  //   let symbol = "ETH";
  //   let tokenName = "Ethereum";
  //   let l1Address = Buffer.from(ETH_ADDRESS.substring(2),"hex");
  //   let l2Address = Buffer.from(ETH_TOKEN_L2_ADDRESS.substring(2),"hex");
  //   let transactionHash = Buffer.from("0000000000000000000000000000000000000000000000000000000000000000","hex");
  //   await transactionManager.query(
  //       `INSERT INTO tokens ("createdAt","updatedAt","number",symbol,"name",decimals,"blockNumber","l2Address",
  //                   "L1Address","transactionHash","logIndex") VALUES (now(),now(),0,$1,$2,18,0,$3,$4, $5,0) ON CONFLICT("l2Address") DO NOTHING`,
  //       [symbol,tokenName,l2Address,l1Address,transactionHash]);
  // }

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

  public async getAllTokens(): Promise<Token[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const tokens = await transactionManager.find(this.entityTarget, {});
    return tokens;
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

  public async updateTokenOffChainData({
    l1Address,
    l2Address,
    liquidity,
    usdPrice,
    updatedAt,
    iconURL,
    priceId,
  }: {
    l1Address?: string;
    l2Address?: string;
    liquidity?: number;
    usdPrice?: number;
    updatedAt?: Date;
    iconURL?: string;
    priceId?: string,
  }): Promise<void> {
    console.log(`updateTokenOffChainData ${l1Address} ${l2Address} ${usdPrice} ${priceId}`);
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
        ...(priceId && {
          priceId,
        }),
      }
    );
  }
}
