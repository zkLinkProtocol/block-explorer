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
import { Block, Transfer } from "../entities";
import { BlockTokenPriceRepository } from "../repositories/blockTokenPrice.repository";
import { BlockTokenPrice } from "../entities/blockTokenPrice.entity";

@Injectable()
export class PointService extends Worker {
  private readonly logger: Logger;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly pointsRepository: PointsRepository,
    private readonly blockRepository: BlockRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository,
    private readonly tokenOffChainDataProvider: TokenOffChainDataProvider
  ) {
    super();
    this.logger = new Logger(PointService.name);
  }

  protected async runProcess(): Promise<void> {
    try {
      let lastRunBlockNumber = await this.pointsRepository.getLastStatisticalBlockNumber();
      this.logger.log(`Last run block number: ${lastRunBlockNumber}`);
      while (true) {
        const currentRunBlock = await this.blockRepository.getLastBlock({
          where: { number: lastRunBlockNumber + 1 },
          select: { number: true, timestamp: true },
        });
        if (!currentRunBlock) {
          break;
        }
        const currentRunBlockNumber = currentRunBlock.number;
        this.logger.log(`Handle point at block: ${currentRunBlockNumber}`);
        const tokenPrices = await this.updateTokenPrice(currentRunBlock);
        // await this.handleDeposit();
        lastRunBlockNumber = currentRunBlockNumber;
      }
    } catch (err) {
      this.logger.error({
        message: "Failed to calculate point",
        originalError: err,
      });
    }

    await waitFor(() => !this.currentProcessPromise, 1000, 1000);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }

  async updateTokenPrice(block: Block): Promise<Map<string, BigNumber>> {
    const allSupportTokens = this.tokenService.getAllSupportTokens();
    const allPriceIds: Set<string> = new Set();
    // do not need to get the price of stable coin(they are default 1 usd)
    allSupportTokens.map((t) => {
      if (t.type !== "Stablecoin") {
        allPriceIds.add(t.cgPriceId);
      }
    });
    const tokenPrices: Map<string, BigNumber> = new Map();
    for (const priceId of allPriceIds) {
      const price = await this.getTokenPriceAtBlockNumber(block, priceId);
      this.logger.log(`Token ${priceId} price: ${price}`);
      tokenPrices.set(priceId, price);
    }
    return tokenPrices;
  }

  async getTokenPriceAtBlockNumber(block: Block, priceId: string): Promise<BigNumber> {
    const blockTokenPrice = await this.blockTokenPriceRepository.getBlockTokenPrice(block.number, priceId);
    if (!blockTokenPrice) {
      const usdPrice = await this.getTokenPriceFromCoingecko(priceId, block.timestamp);
      const entity = {
        blockNumber: block.number,
        priceId,
        usdPrice: usdPrice.toNumber(),
      };
      await this.blockTokenPriceRepository.add(entity);
      return usdPrice;
    } else {
      return new BigNumber(blockTokenPrice.usdPrice);
    }
  }

  async getTokenPriceFromCoingecko(priceId: string, blockTime: Date): Promise<BigNumber> {
    // this interface will return 0 if no price found at the block time
    const usdPrice = await this.tokenOffChainDataProvider.getTokenPriceByBlock(priceId, blockTime.getTime());
    if (!usdPrice) {
      throw new Error(`Get token ${priceId} price failed, returned result: ${usdPrice}`);
    }
    return new BigNumber(usdPrice);
  }

  // async handleDeposit() {
  //   const transfers = await this.transferRepository.getBlockDeposits(currentRunBlockNumber);
  //   this.logger.log(`Block ${currentRunBlockNumber} deposit num: ${transfers.length}`);
  //   if (transfers.length === 0) {
  //     continue;
  //   }
  //   for (const transfer of transfers) {
  //   }
  // }
  //
  // async recordDepositPoint(transfer: Transfer) {
  //   const point = await this.calculateDepositPoint(transfer);
  //   const addressActive = await this.addressActiveRepository.getAddressActive(transfer.from);
  //   let active = addressActive.active;
  //   if (!active) {
  //     // if (point > threshold) {
  //     //   // set address active at block number
  //     //   active = true;
  //     // }
  //   }
  //   if (active) {
  //     // add deposit point
  //   }
  // }
  //
  // async calculateDepositPoint(transfer: Transfer): Promise<BigNumber> {
  //   return BigNumber(13);
  // }
}
