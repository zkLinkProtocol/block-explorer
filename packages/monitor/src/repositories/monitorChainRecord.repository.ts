import { Injectable } from "@nestjs/common";
import { MonitorChainRecord} from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { FindManyOptions, MoreThanOrEqual } from "typeorm";
import { BigNumber } from "ethers";

@Injectable()
export class MonitorChainRecordRepository extends BaseRepository<MonitorChainRecord> {
  public constructor(unitOfWork: UnitOfWork) {
    super(MonitorChainRecord, unitOfWork);
  }

  async updataBlockNumber(name: string,blockNumber: number){
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update(
        this.entityTarget,
        {
          name: name
        },
        {
          chainNumber: blockNumber
        }
    )
  }
}
