import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { BlockGroupTvl } from "../entities/blockGroupTvl.entity";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { GroupTvl } from "../entities";

@Injectable()
export class BlockGroupTvlRepository extends BaseRepository<BlockGroupTvl> {
  public constructor(unitOfWork: UnitOfWork) {
    super(BlockGroupTvl, unitOfWork);
  }

  public async getGroupTvl(blockNumber: number, groupId: string): Promise<BlockGroupTvl> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<BlockGroupTvl>(BlockGroupTvl, {
      where: { blockNumber, groupId },
    });
  }

  public createDefaultBlockGroupTvl(blockNumber: number, groupId: string, groupTvl: number): BlockGroupTvl {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      blockNumber: blockNumber,
      groupId: groupId,
      tvl: groupTvl,
    };
  }

  public async upsertGroupTvl(
    blockGroupTvl: QueryDeepPartialEntity<BlockGroupTvl>,
    groupTvl: QueryDeepPartialEntity<GroupTvl>
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.upsert<BlockGroupTvl>(BlockGroupTvl, blockGroupTvl, ["blockNumber", "groupId"]);
      await entityManager.upsert<GroupTvl>(GroupTvl, groupTvl, ["groupId"]);
    });
  }
}
