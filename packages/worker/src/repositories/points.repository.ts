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

  public async update(address: string,refPoint: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update<Point>(Point, {
      address,
    },{ refPoint });
  }

  public async getStakePointByAddress(address: string): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const accountPoint = await transactionManager
        .createQueryBuilder(Point, "point")
        .select("point.stakePoint")
        .where ({ address })
        .getOne();
    return accountPoint?.stakePoint || 0;
  }

}
