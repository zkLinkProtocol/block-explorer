import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TokenController } from "./token.controller";
import { TokenService } from "./token.service";
import { Token } from "./token.entity";
import { Block } from "../block/block.entity";
import { Transaction } from "../transaction/entities/transaction.entity";
import { TransferModule } from "../transfer/transfer.module";
import { Transfer } from "../transfer/transfer.entity";
import { Balance } from "../balance/balance.entity";
import { FetSqlRecordStatus } from "../historyToken/entities/fetSqlRecordStatus.entity";
import { MonitAddressHistory } from "../historyToken/entities/monitAddressHistory.entity";
import { MonitAddressLast } from "../historyToken/entities/monitAddressLast.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Token, Block, Transaction, Transfer, Balance, FetSqlRecordStatus, MonitAddressHistory, MonitAddressLast]), TransferModule],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
