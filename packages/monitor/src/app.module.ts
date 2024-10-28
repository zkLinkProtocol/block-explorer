import { Module, Logger } from '@nestjs/common';
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import config from './config';
import {
  BlockRepository,
  BalanceRepository,
  TransferRepository,
  MonitAddressHistoryRepository,
  MonitorChainRecordRepository,
  MonitAddressLastRepository,
  MonitAddressConfigListRepository,
  MonitAddressUserListRepository,
} from './repositories';
import { Block,Balance,Batch,Token,Transfer,Transaction,MonitAddressHistory,MonitAddressLast,MonitAddressConfigList,MonitAddressUserList,MonitorChainRecord } from './entities';
import { typeOrmModuleOptions } from './typeorm.config';
import { UnitOfWorkModule } from './unitOfWork';
import { MonitorZKLAmountService } from './watcher/watcher.service';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    ScheduleModule.forRoot(),
    PrometheusModule.register(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        return {
          ...typeOrmModuleOptions,
          autoLoadEntities: true,
          retryDelay: 3000, // to cover 3 minute DB failover window
          retryAttempts: 70, // try to reconnect for 3.5 minutes,
        };
      },
    }),
    TypeOrmModule.forFeature([Block,Balance,Batch,Token,Transfer,Transaction,MonitAddressHistory,MonitAddressLast,MonitAddressConfigList,MonitAddressUserList,MonitorChainRecord]),
    UnitOfWorkModule,
  ],
  providers: [
    BlockRepository,
    BalanceRepository,
    TransferRepository,
    MonitorChainRecordRepository,
    MonitAddressLastRepository,
    MonitAddressConfigListRepository,
    MonitAddressHistoryRepository,
    MonitAddressUserListRepository,
    MonitorZKLAmountService,
    Logger,
  ],
})
export class AppModule {}
