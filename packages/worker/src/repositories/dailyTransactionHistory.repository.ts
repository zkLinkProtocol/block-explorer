import { Injectable } from "@nestjs/common";
import { DailyTxHistory } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";

@Injectable()
export class DailyTransactionHistoryRepository extends BaseRepository<DailyTxHistory> {
  public constructor(unitOfWork: UnitOfWork) {
    super(DailyTxHistory, unitOfWork);
  }
}
