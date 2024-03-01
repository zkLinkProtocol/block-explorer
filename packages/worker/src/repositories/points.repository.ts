import { Injectable } from "@nestjs/common";
import { FindOptionsWhere, FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { UnitOfWork } from "../unitOfWork";
import {Block, Point} from "../entities";

@Injectable()
export class PointsRepository {
  public constructor(private readonly unitOfWork: UnitOfWork) {}

  public async add(address: string,stakePoint: number,refPoint: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.insert<Point>(Point, {
      address,stakePoint,refPoint,
    });
  }

  public async update(address: Buffer,refPoint: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update<Point>(Point, {
      address: address.toString('hex'),
    },{ refPoint });
  }

  public async getStakePointByAddress(address: Buffer): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const accountPoint = await transactionManager.query(`SELECT "stakePoint" FROM points WHERE address = $1`,[address]);
    return accountPoint?.stakePoint || 0;
  }
}
