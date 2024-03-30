import { Injectable } from "@nestjs/common";
import { PriceHistory, Token } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";

@Injectable()
export class PriceHistoryRepository extends BaseRepository<PriceHistory> {
  public constructor(unitOfWork: UnitOfWork) {
    super(PriceHistory, unitOfWork);
  }

  public async recordPriceHistory({l2Address,dateTime,price,l1Address,bridgedTokens}: {
    l2Address: string | null;
    dateTime: Date;
    price: number;
    l1Address:string | null;
    bridgedTokens: Token[];
  }): Promise<void> {
    if ((l1Address !== null || l2Address !== null)&&price !== null){
      if(l2Address !== null){
        const transactionManager = this.unitOfWork.getTransactionManager();
        await transactionManager.query('INSERT INTO public."priceHistory" ("l2Address", "usdPrice", "timestamp") VALUES ($1, $2, $3) RETURNING *', [l2Address, price, dateTime]);
      }else {
        const curToken = bridgedTokens.find( t=> t.l1Address === l1Address);
        if (curToken !== undefined && curToken !== null && curToken.l2Address !== null && curToken.l2Address !== undefined){
          const transactionManager = this.unitOfWork.getTransactionManager();
          await transactionManager.query('INSERT INTO public."priceHistory" ("l2Address", "usdPrice", "timestamp") VALUES ($1, $2, $3) RETURNING *', [curToken.l2Address, price, dateTime]);
        }
      }
    }
  }
}
