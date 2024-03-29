import { Injectable } from "@nestjs/common";
import { PriceHistory } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

@Injectable()
export class PriceHistoryRepository extends BaseRepository<PriceHistory> {
  public constructor(unitOfWork: UnitOfWork) {
    super(PriceHistory, unitOfWork);
  }
  public async foundCurPriceHistory({
    l2Address,
    dateTime,
  }: {
    l2Address: string;
    dateTime: Date;
  }): Promise<PriceHistory[]> {
    const startTime = dateTime.toTimeString();
    const endTime = dateTime.toTimeString();
    const transactionManager = this.unitOfWork.getTransactionManager();
    const res = await transactionManager.query(
      `
      SELECT *  
      FROM priceHistory  
      WHERE l2address = $1  
      AND timestamp BETWEEN $2 AND $3;  
    `,
      [l2Address, startTime, endTime]
    );
    return res.rows;
  }
}
