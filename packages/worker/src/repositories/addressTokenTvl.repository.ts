import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { AddressTokenTvl } from "../entities";

@Injectable()
export class AddressTokenTvlRepository extends BaseRepository<AddressTokenTvl> {
  public constructor(unitOfWork: UnitOfWork) {
    super(AddressTokenTvl, unitOfWork);
  }

  public async getAddressTokenTvl(address: string, tokenAddress: string): Promise<AddressTokenTvl> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<AddressTokenTvl>(AddressTokenTvl, {
      where: { address, tokenAddress },
    });
  }

  public createDefaultAddressTokenTvl(address: string, tokenAddress: string): AddressTokenTvl {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      address: address,
      tokenAddress: tokenAddress,
      balance: 0,
      tvl: 0,
    };
  }
}
