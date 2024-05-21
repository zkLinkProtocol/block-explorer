import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { HistoryTokenService } from "./historyToken/historyToken.service";


@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(
      private readonly historyTokenService:HistoryTokenService,
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
    const tasks = [this.historyTokenService.start()];
    return Promise.all(tasks);
  }

  private stopWorkers() {
    return Promise.all([
        this.historyTokenService.stop()
    ]);
  }
}
