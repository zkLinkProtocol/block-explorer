import { Injectable } from "@nestjs/common";
import { MonitAddressLast } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { FindManyOptions, MoreThanOrEqual } from "typeorm";
import { BigNumber } from "ethers";

@Injectable()
export class MonitAddressLastRepository extends BaseRepository<MonitAddressLast> {
  public constructor(unitOfWork: UnitOfWork) {
    super(MonitAddressLast, unitOfWork);
  }

  async updataAmount(address: string, owner: string, network: string, amount: BigNumber, change: BigNumber){
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
            change: change,
        }
    );
  }
}
