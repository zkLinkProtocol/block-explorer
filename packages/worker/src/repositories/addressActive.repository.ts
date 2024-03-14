import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { AddressActive } from "../entities";

@Injectable()
export class AddressActiveRepository extends BaseRepository<AddressActive> {
  public constructor(unitOfWork: UnitOfWork) {
    super(AddressActive, unitOfWork);
  }

  public async getAddressActive(address: string): Promise<AddressActive> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<AddressActive>(AddressActive, {
      where: { address },
    });
  }
}
