import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { BlockAddressPoint } from "../entities";
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

  public async getLatestPoint(address: string): Promise<BlockAddressPoint> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<BlockAddressPoint>(BlockAddressPoint, {
      select: { totalStakePoint: true, totalRefPoint: true },
      where: { address },
      order: { blockNumber: "DESC" },
    });
  }

  public async upsertBlockAddressPoint(
    blocBlockAddressPoint: QueryDeepPartialEntity<BlockAddressPoint>,
    transferId: number
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.upsert<BlockAddressPoint>(BlockAddressPoint, blocBlockAddressPoint, [
        "blockNumber",
        "address",
      ]);
      await entityManager.query(`SELECT setval('"pointParsedTransferId"', $1, false);`, [transferId]);
    });
  }
}
