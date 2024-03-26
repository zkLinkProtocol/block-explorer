import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import waitFor from "../utils/waitFor";
import { Worker } from "../common/worker";
import { BlockRepository, TVLHistoryRepository, TokenRepository } from "../repositories";
import { Block } from "../entities";
import { BigNumber } from "ethers";

@Injectable()
export class HistoryService extends Worker {
  private readonly updateTvlHistoryInterval: number;
  private readonly logger: Logger;

  public constructor(
    private readonly tokenRepository: TokenRepository,

    private readonly blockRepository: BlockRepository,
    private readonly tvlHistoryRepository: TVLHistoryRepository,
    configService: ConfigService
  ) {
    super();
    this.updateTvlHistoryInterval = configService.get<number>("tokens.updateTvlHistoryInterval");
    this.logger = new Logger(HistoryService.name);
  }

  protected async runProcess(): Promise<void> {
    try {
      await this.recordTVLHistory();
    } catch (err) {
      this.logger.error({
        message: "Failed to update tokens total supply data",
        originalError: err,
      });
    }

    await waitFor(() => !this.currentProcessPromise, this.updateTvlHistoryInterval);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }

  private async recordTVLHistory(): Promise<void> {
    const block: Block = await this.blockRepository.getLastBlock({ select: { number: true, timestamp: true } });
    const totalTVL: BigNumber = await this.tokenRepository.getTotalTVL();

    await this.tvlHistoryRepository.add({
      blockNumber: block.number,
      timestamp: block.timestamp,
      tvl: BigNumber.from(totalTVL.toString()),
    });
  }
}
