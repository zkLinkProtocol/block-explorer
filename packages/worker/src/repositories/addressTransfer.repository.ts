import { Injectable } from "@nestjs/common";
import { AddressTransfer } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";

@Injectable()
export class AddressTransferRepository extends BaseRepository<AddressTransfer> {
  public constructor(unitOfWork: UnitOfWork) {
    super(AddressTransfer, unitOfWork);
  }
  public async getUawNumber(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const count = await transactionManager.query('select count(*) from (select address from "addressTransactions" group by 1) adddresses;');
    return count[0].count;
  }
}
