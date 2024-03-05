import { Injectable } from "@nestjs/common";
import { FindOptionsWhere, FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { UnitOfWork } from "../unitOfWork";
import {Block, Point} from "../entities";

@Injectable()
export class PointsRepository {
  public constructor(private readonly unitOfWork: UnitOfWork) {}

  public async add(address: string,stakePoint: number,refPoint: number,refNumber: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(
        `INSERT INTO points (address,"stakePoint","refPoint","refNumber") VALUES ($1,$2,$3,$4) 
            ON CONFLICT (address) 
            DO UPDATE
            SET "stakePoint" = $2,
            "refPoint" = $3,
            "refNumber" = $4
            `, [
      address,stakePoint,refPoint,refNumber
    ]);
  }

  public async update(address: Buffer,refPoint: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update<Point>(Point, {
      address: address.toString('hex'),
    },{ refPoint });
  }

  public async updateDeposits(deposits: Map<Buffer,number>): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    for (const [address,depositPoint] of deposits) {
      let [ret] = await transactionManager.query(
          `SELECT "stakePoint"
           FROM points
           WHERE address = $1`, [address]);
      if (!ret) {
        await transactionManager.query(
            `INSERT INTO points (address, "stakePoint", "refPoint", "refNumber")
             VALUES ($1, $2, 0, 0)`, [address, depositPoint]);
      } else {
        await transactionManager.query(
            `UPDATE points SET "stakePoint" = "stakePoint" + $2 WHERE address = $1`, [address, depositPoint]);
      }
    }
  }

  public async getStakePointByAddress(address: Buffer): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const accountPoint = await transactionManager.query(`SELECT "stakePoint" FROM points WHERE address = $1`,[address]);
    return accountPoint?.stakePoint || 0;
  }
}
