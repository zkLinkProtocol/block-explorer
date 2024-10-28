import { Injectable } from "@nestjs/common";
import { MonitAddressUserList } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { FindManyOptions, MoreThanOrEqual } from "typeorm";
import { BigNumber } from "ethers";

@Injectable()
export class MonitAddressUserListRepository extends BaseRepository<MonitAddressUserList> {
  public constructor(unitOfWork: UnitOfWork) {
    super(MonitAddressUserList, unitOfWork);
  }

  async updataAmount(address: string, owner: string, network: string, amount: BigNumber){
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update(
        this.entityTarget,
        {
          address: address,
          owner: owner,
          network: network
        },
        {
          zklAmount: amount,
        }
    );
  }
}
