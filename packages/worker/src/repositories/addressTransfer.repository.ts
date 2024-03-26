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
    const count = await transactionManager
        .createQueryBuilder(AddressTransfer, "addressTransfer")
        .select("addressTransfer.address")
        .distinct(true)
        .getCount();
    console.log("uaw number : ",count);
    return count;
  }
}
