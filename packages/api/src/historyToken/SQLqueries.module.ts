import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transfer } from "../transfer/transfer.entity";
import { SQLQueriesService } from "./SQLqueries.service";
import { WithdrawalTxAmount } from "./entities/withdrawalTxAmount.entity";
import { FetSqlRecordStatus } from "./entities/fetSqlRecordStatus.entity";

@Module({
  imports: [
      TypeOrmModule.forFeature([WithdrawalTxAmount, FetSqlRecordStatus, Transfer]),
  ],
  providers: [SQLQueriesService],
  exports: [SQLQueriesService],
})
export class SQLQueriesModule {}
