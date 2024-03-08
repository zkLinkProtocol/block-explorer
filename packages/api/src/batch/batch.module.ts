import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransferModule } from "src/transfer/transfer.module";
import { BatchService } from "../batch/batch.service";
import { BatchController } from "./batch.controller";
import { Batch } from "./batch.entity";
import { BatchDetails } from "./batchDetails.entity";
import { BatchRootEventLogs } from "./batchRootEventLogs.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Batch, BatchDetails, BatchRootEventLogs]), TransferModule],
  controllers: [BatchController],
  providers: [BatchService],
  exports: [BatchService],
})
export class BatchModule {}
