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
    const count = await transactionManager.query('SELECT count(distinct address)FROM public."addressTransfers";');
    return count[0].count;
  }
}
