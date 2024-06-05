import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { TransactionReceiptService } from "./transactionReceipt.service";
import { Transaction } from "./entities/transaction.entity";
import { TransactionDetails } from "./entities/transactionDetails.entity";
import { AddressTransaction } from "./entities/addressTransaction.entity";
import { TransactionReceipt } from "./entities/transactionReceipt.entity";
import { DailyTxHistory } from "./entities/dailyTxHistory.entity";
import { Batch } from "../batch/batch.entity";
import { TransferModule } from "../transfer/transfer.module";
import { CounterModule } from "../counter/counter.module";
import { LogModule } from "../log/log.module";
import { FetSqlRecordStatus } from "../historyToken/entities/fetSqlRecordStatus.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionDetails, AddressTransaction, TransactionReceipt, Batch, DailyTxHistory, FetSqlRecordStatus]),
    TransferModule,
    LogModule,
    CounterModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService, TransactionReceiptService],
  exports: [TransactionService, TransactionReceiptService],
})
export class TransactionModule {}
