import { Injectable } from "@nestjs/common";
import { AddressTransaction } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";

@Injectable()
export class AddressTransactionRepository extends BaseRepository<AddressTransaction> {
  public constructor(unitOfWork: UnitOfWork) {
    super(AddressTransaction, unitOfWork);
  }
  public async countAddressOnDate(date: string): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
        `select count(*) from (select address from "addressTransactions" WHERE DATE("receivedAt") = $1 group by 1) adddresses;`,
        [date]
    );
    return result[0].count||0;
  }
}
