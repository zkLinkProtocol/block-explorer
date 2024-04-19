import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import { BalanceService } from "./balance.service";
import { BlockRepository } from "../repositories/block.repository";
import { PointsRepository } from "../repositories";

@Injectable()
export class BalancesCleanerService extends Worker {
  private readonly deleteBalancesInterval: number;

  public constructor(
    private readonly balanceService: BalanceService,
    private readonly blockRepository: BlockRepository,
    private readonly pointsRepository: PointsRepository,
    configService: ConfigService
  ) {
    super();
    this.deleteBalancesInterval = configService.get<number>("balances.deleteBalancesInterval");
  }

  protected async runProcess(): Promise<void> {
    const lastStatisticalBlockNumber = await this.pointsRepository.getLastHoldPointStatisticalBlockNumber();
    const lastRunBlockNumber = await this.balanceService.getDeleteBalancesFromBlockNumber();

    if (lastStatisticalBlockNumber > lastRunBlockNumber) {
      await this.balanceService.deleteOldBalances(lastRunBlockNumber, lastStatisticalBlockNumber);
      await this.balanceService.setDeleteBalancesFromBlockNumber(lastStatisticalBlockNumber);
    }

    await waitFor(() => !this.currentProcessPromise, this.deleteBalancesInterval);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }
}
