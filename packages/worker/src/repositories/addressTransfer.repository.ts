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
    // const count = await transactionManager
    //     .createQueryBuilder(AddressTransfer, "addressTransfers")
    //     .select("addressTransfers.address")
    //     .distinct(true)
    //     .getCount();
    const count = await transactionManager.query('SELECT count(distinct address)FROM public."addressTransfers";');
    // console.log("uaw number : ",count[0].count);
    return count[0].count;
  }
}
