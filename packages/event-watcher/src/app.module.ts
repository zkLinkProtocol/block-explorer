import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import config from './config';
import {
  BatchRootEventLogsRepository,
  EventProcessRepository,
} from './repositories';
import { BatchRootEventLogs, EventProcess } from './entities';
import { typeOrmModuleOptions } from './typeorm.config';
import { UnitOfWorkModule } from './unitOfWork';
import { WatcherService } from './watcher/watcher.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
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
    TypeOrmModule.forFeature([BatchRootEventLogs, EventProcess]),
    UnitOfWorkModule,
  ],
  providers: [
    BatchRootEventLogsRepository,
    EventProcessRepository,
    WatcherService,
    Logger,
  ],
})
export class AppModule {}
