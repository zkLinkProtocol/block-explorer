import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import {
  TokenRepository,
  BalanceRepository,
  ReferralsRepository,
  TvlRepository,
  PointsRepository,
  BlockRepository,
  TransferRepository,
} from "../repositories";
import { TokenOffChainDataProvider } from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import { TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { AddressActiveRepository } from '../repositories/addressActive.repository';
import { Transfer } from '../entities';
@Injectable()
export class DepositService extends Worker {
  private readonly logger: Logger;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly balanceRepository: BalanceRepository,
    private readonly pointsRepository: PointsRepository,
    private readonly blockRepository: BlockRepository,
    private readonly transferRepository: TransferRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly addressActiveRepository: AddressActiveRepository,
    private readonly tvlRepository: TvlRepository,
    private readonly tokenOffChainDataProvider: TokenOffChainDataProvider,
    configService: ConfigService
  ) {
    super();
    this.logger = new Logger(DepositService.name);
  }

  protected async runProcess(): Promise<void> {
    try {
      let lastRunBlockNumber = await this.pointsRepository.getLastDepositStatisticalBlockNumber();

      while (true) {
        const currentRunBlock = await this.blockRepository.getLastBlock({
          where: { number: lastRunBlockNumber + 1 },
          select: { number: true, timestamp: true },
        });
        const currentRunBlockNumber = currentRunBlock?.number;
        if (!currentRunBlockNumber) {
          return;
        }
        lastRunBlockNumber = currentRunBlockNumber;
        const transfers = await this.transferRepository.getBlockDeposits(currentRunBlockNumber);
        this.logger.log(`Block ${currentRunBlockNumber} deposit num: ${transfers.length}`);
        if (transfers.length === 0) {
          continue;
        }
        for (const transfer of transfers) {
        }
      }
    } catch (err) {
      this.logger.error({
        message: "Failed to calculate deposit point",
        originalError: err,
      });
    }

    await waitFor(() => !this.currentProcessPromise, 1000, 1000);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }

  async recordDepositPoint(transfer: Transfer) {
    const point = await this.calculateDepositPoint(transfer);
    const addressActive = await this.addressActiveRepository.getAddressActive(transfer.from);
    let active = addressActive.active;
    if (!active) {
      if (point > threshold) {
        // set address active at block number
        active = true;
      }
    }
    if (active) {
      // add deposit point
    }
  }

  async calculateDepositPoint(transfer: Transfer):Promise<BigNumber> {}
}
