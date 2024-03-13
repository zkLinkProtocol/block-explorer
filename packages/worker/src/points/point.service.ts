import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import { PointsRepository, BlockRepository, TransferRepository } from "../repositories";
import { TokenOffChainDataProvider } from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import { Token, TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { Block, Transfer } from "../entities";
import { BlockTokenPriceRepository } from "../repositories/blockTokenPrice.repository";
import { BlockAddressPointRepository } from "../repositories/blockAddressPoint.repository";
import { sleep } from "zksync-web3/build/src/utils";
import { hexTransformer } from "../transformers/hex.transformer";

const STABLE_COIN_TYPE = "Stablecoin";
const ETHEREUM_CG_PRICE_ID = "ethereum";
const DEPOSIT_MULTIPLIER: BigNumber = new BigNumber(10);

@Injectable()
export class PointService extends Worker {
  private readonly logger: Logger;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly pointsRepository: PointsRepository,
    private readonly blockRepository: BlockRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository,
    private readonly blockAddressPointRepository: BlockAddressPointRepository,
    private readonly transferRepository: TransferRepository,
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
        await this.handleDeposit(currentRunBlockNumber, tokenPrices);
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
      if (t.type !== STABLE_COIN_TYPE) {
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
    // we need to wait until get the exactly right price
    let usdPrice: number;
    while (true) {
      usdPrice = await this.tokenOffChainDataProvider.getTokenPriceByBlock(priceId, blockTime.getTime());
      if (usdPrice > 0) {
        break;
      }
      this.logger.log(
        `The latest price of token ${priceId} returned from data provider is delayed, sleep 1 minute for next try`
      );
      // wait one minute for the next try
      await sleep(60000);
    }
    return new BigNumber(usdPrice);
  }

  async handleDeposit(blockNumber: number, tokenPrices: Map<string, BigNumber>) {
    const transfers = await this.transferRepository.getBlockDeposits(blockNumber);
    this.logger.log(`Block ${blockNumber} deposit num: ${transfers.length}`);
    if (transfers.length === 0) {
      return;
    }
    for (const transfer of transfers) {
      await this.recordDepositPoint(transfer, tokenPrices);
    }
  }

  async recordDepositPoint(transfer: Transfer, tokenPrices: Map<string, BigNumber>) {
    const blockNumber: number = transfer.blockNumber;
    const from: string = hexTransformer.from(transfer.from);
    const tokenAddress: string = hexTransformer.from(transfer.tokenAddress);
    const tokenAmount: BigNumber = new BigNumber(transfer.amount);
    const transferId: number = transfer.number;
    this.logger.log(
      `Handle deposit: [from = ${from}, tokenAddress = ${tokenAddress}, tokenAmount = ${tokenAmount}, transferId = ${transferId}]`
    );
    const lastParsedTransferId = await this.blockAddressPointRepository.getLastParsedTransferId();
    if (transfer.number <= lastParsedTransferId) {
      this.logger.log(`Last parsed transfer id: ${lastParsedTransferId}, ignore transfer :${transferId}`);
      return;
    }
    const tokenInfo = this.tokenService.getSupportToken(tokenAddress);
    if (!tokenInfo) {
      this.logger.log(`Token ${tokenAddress} not support for point`);
      await this.blockAddressPointRepository.setParsedTransferId(transferId);
      return;
    }
    const newDepositPoint = await this.calculateDepositPoint(tokenAmount, tokenInfo, tokenPrices);
    const blockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, from);
    const upsert = {
      blockNumber: blockNumber,
      address: from,
      depositPoint: newDepositPoint.toNumber(),
      holdPoint: 0,
      refPoint: 0,
      totalStakePoint: newDepositPoint.toNumber(),
      totalRefPoint: 0,
    };
    if (!!blockAddressPoint) {
      upsert.depositPoint += Number(blockAddressPoint.depositPoint);
      upsert.holdPoint = blockAddressPoint.holdPoint;
      upsert.refPoint = blockAddressPoint.refPoint;
      upsert.totalStakePoint += Number(blockAddressPoint.totalStakePoint);
      upsert.totalRefPoint = blockAddressPoint.totalRefPoint;
    }
    await this.blockAddressPointRepository.upsertBlockAddressPoint(upsert, transferId);
  }

  async calculateDepositPoint(
    tokenAmount: BigNumber,
    token: Token,
    tokenPrices: Map<string, BigNumber>
  ): Promise<BigNumber> {
    // NOVA Points = 10 * Token multiplier * Deposit Amount * Token Price / ETH price
    // The price of Stablecoin is 1 usd
    let price: BigNumber;
    if (token.type === STABLE_COIN_TYPE) {
      price = new BigNumber(1);
    } else {
      price = tokenPrices.get(token.cgPriceId);
    }
    if (!price) {
      throw new Error(`Token ${token.symbol} price not found`);
    }
    const ethPrice = tokenPrices.get(ETHEREUM_CG_PRICE_ID);
    if (!ethPrice) {
      throw new Error(`Ethereum price not found`);
    }
    if (!token.multiplier) {
      throw new Error(`Token ${token.symbol} multiplier not found`);
    }
    if (!token.decimals) {
      throw new Error(`Token ${token.symbol} decimals not found`);
    }
    const tokenMultiplier = new BigNumber(token.multiplier);
    const depositAmount = tokenAmount.dividedBy(new BigNumber(10).pow(token.decimals));
    const point = DEPOSIT_MULTIPLIER.multipliedBy(tokenMultiplier)
      .multipliedBy(depositAmount)
      .multipliedBy(price)
      .dividedBy(ethPrice);
    this.logger.log(
      `Deposit point = ${point}, [deposit multiplier = ${DEPOSIT_MULTIPLIER}, token multiplier = ${tokenMultiplier}, deposit amount = ${depositAmount}, token price = ${price}, eth price = ${ethPrice}]`
    );
    return point;
  }
}
