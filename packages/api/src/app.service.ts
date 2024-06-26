import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { HistoryTokenService } from "./historyToken/historyToken.service";
import { SQLQueriesService } from "./historyToken/SQLqueries.service";


@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(
      private readonly historyTokenService:HistoryTokenService,
      private readonly sqlQueriesService:SQLQueriesService,
  ) {
    this.logger = new Logger(AppService.name);
  }

  public onModuleInit() {
    this.startWorkers();
  }

  public onModuleDestroy() {
    this.stopWorkers();
  }

  private startWorkers() {
    const tasks = [this.historyTokenService.start(),this.sqlQueriesService.start()];
    return Promise.all(tasks);
  }

  private stopWorkers() {
    return Promise.all([
        this.historyTokenService.stop(),
        this.sqlQueriesService.stop(),
    ]);
  }
}
