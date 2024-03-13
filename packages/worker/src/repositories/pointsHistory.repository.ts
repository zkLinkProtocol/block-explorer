import { Injectable } from "@nestjs/common";
import { FindOptionsWhere, FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { UnitOfWork } from "../unitOfWork";
import {PointsHistory} from "../entities";

@Injectable()
export class PointsHistoryRepository {
  public constructor(private readonly unitOfWork: UnitOfWork) {}

  public async add(address: string,blockNumber: number,stakePoint: number,refPoint: number,updateType:string): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.insert<PointsHistory>(PointsHistory, {
      address,blockNumber,stakePoint,refPoint,updateType
    });
  }

  public async addDepositsHistory(deposits: Map<string,number>,blockNumber:number): Promise<void> {
      const updateType = "DepositAdd";
      const transactionManager = this.unitOfWork.getTransactionManager();
      for (const [address,depositPoint] of deposits) {
        await transactionManager.insert<PointsHistory>(PointsHistory, {
          address,blockNumber,stakePoint:depositPoint,refPoint:0,updateType
        });
    }
  }

  public async getLastHandlePointBlock(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    let [ret] = await transactionManager.query(
        `SELECT MAX("blockNumber") FROM "pointsHistory" WHERE opType = 'PeriodUpdate'`);
    if (!ret) {
      return 0;
    } else {
      return ret.max;
    }
  }
}
