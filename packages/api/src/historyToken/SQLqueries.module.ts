import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transfer } from "../transfer/transfer.entity";
import { SQLQueriesService } from "./SQLqueries.service";
import { WithdrawalTxAmount } from "./entities/withdrawalTxAmount.entity";
import { FetSqlRecordStatus } from "./entities/fetSqlRecordStatus.entity";
import { UawAddress } from "./entities/uawAddress.entity";
import { AddressTransaction } from "../transaction/entities/addressTransaction.entity";

@Module({
  imports: [
      TypeOrmModule.forFeature([WithdrawalTxAmount, FetSqlRecordStatus, Transfer, UawAddress, AddressTransaction]),
  ],
  providers: [SQLQueriesService],
  exports: [SQLQueriesService],
})
export class SQLQueriesModule {}
