import { Injectable } from '@nestjs/common';
import { EventProcess } from '../entities';
import { UnitOfWork } from '../unitOfWork';
import { BaseRepository } from './base.repository';

@Injectable()
export class EventProcessRepository extends BaseRepository<EventProcess> {
  public constructor(unitOfWork: UnitOfWork) {
    super(EventProcess, unitOfWork);
  }

  public override async addMany(
    records: Partial<EventProcess>[],
  ): Promise<void> {
    await super.addMany(records);
  }

  async upsertEventProcess(
    topic: string,
    chainId: number,
    contractAddress: string,
    processedBlockNumber: number,
  ) {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager
      .createQueryBuilder()
      .insert()
      .into(EventProcess)
      .values({ topic, chainId, contractAddress, processedBlockNumber })
      .orUpdate(
        ['processedBlockNumber', 'updatedAt'],
        ['topic', 'chainId', 'contractAddress'],
      )
      .execute();
  }
}
