import { Injectable } from '@nestjs/common';
import { BatchRootEventLogs } from '../entities';
import { UnitOfWork } from '../unitOfWork';
import { BaseRepository } from './base.repository';

@Injectable()
export class BatchRootEventLogsRepository extends BaseRepository<BatchRootEventLogs> {
  public constructor(unitOfWork: UnitOfWork) {
    super(BatchRootEventLogs, unitOfWork);
  }

  public override async addMany(
    records: Partial<BatchRootEventLogs>[],
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager
      .createQueryBuilder()
      .insert()
      .into(BatchRootEventLogs)
      .values(records)
      .orIgnore()
      .execute();
  }
}
