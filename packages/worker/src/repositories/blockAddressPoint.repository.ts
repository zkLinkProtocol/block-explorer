import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { BlockAddressPoint, Point } from "../entities";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

@Injectable()
export class BlockAddressPointRepository extends BaseRepository<BlockAddressPoint> {
  public constructor(unitOfWork: UnitOfWork) {
    super(BlockAddressPoint, unitOfWork);
  }

  public async getLastParsedTransferId(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const [parsedTransferId] = await transactionManager.query(`SELECT last_value FROM "pointParsedTransferId";`);
    return Number(parsedTransferId.last_value);
  }

  public async setParsedTransferId(transferId: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(`SELECT setval('"pointParsedTransferId"', $1, false);`, [transferId]);
  }

  public async getBlockAddressPoint(blockNumber: number, address: string): Promise<BlockAddressPoint> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<BlockAddressPoint>(BlockAddressPoint, {
      where: { blockNumber, address },
    });
  }

  public createDefaultBlockAddressPoint(blockNumber: number, address: string): BlockAddressPoint {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      blockNumber: blockNumber,
      address: address,
      depositPoint: 0,
      tvl: 0,
      holdBasePoint: 0,
      holdPoint: 0,
      refPoint: 0,
    };
  }

  public async upsertUserAndReferrerPoint(
    fromBlocBlockAddressPoint: QueryDeepPartialEntity<BlockAddressPoint>,
    fromAddressPoint: QueryDeepPartialEntity<Point>,
    referrerBlocBlockAddressPoint?: QueryDeepPartialEntity<BlockAddressPoint>,
    referrerAddressPoint?: QueryDeepPartialEntity<Point>,
    transferId?: number
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.upsert<BlockAddressPoint>(BlockAddressPoint, fromBlocBlockAddressPoint, [
        "blockNumber",
        "address",
      ]);
      await entityManager.upsert<Point>(Point, fromAddressPoint, ["address"]);
      if (!!referrerBlocBlockAddressPoint) {
        await entityManager.upsert<BlockAddressPoint>(BlockAddressPoint, referrerBlocBlockAddressPoint, [
          "blockNumber",
          "address",
        ]);
      }
      if (!!referrerAddressPoint) {
        await entityManager.upsert<Point>(Point, referrerAddressPoint, ["address"]);
      }
      if (!!transferId) {
        await entityManager.query(`SELECT setval('"pointParsedTransferId"', $1, false);`, [transferId]);
      }
    });
  }

  public async upsertBlockAddressPoint(blockAddressPoint: QueryDeepPartialEntity<BlockAddressPoint>): Promise<void> {
    await this.upsert(blockAddressPoint, true, ["blockNumber", "address"]);
  }
}
