import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import {
  PointsRepository,
  BlockRepository,
  TransferRepository,
  BlockTokenPriceRepository,
  BlockAddressPointRepository,
  AddressActiveRepository,
  ReferrerRepository,
} from "../repositories";
import { TokenOffChainDataProvider } from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import { Token, TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { Block, BlockAddressPoint, Point, Transfer } from "../entities";
import { hexTransformer } from "../transformers/hex.transformer";
import { ConfigService } from "@nestjs/config";

const STABLE_COIN_TYPE = "Stablecoin";
const ETHEREUM_CG_PRICE_ID = "ethereum";
const DEPOSIT_MULTIPLIER: BigNumber = new BigNumber(10);
const EARLY_ACTIVE_DEPOSIT_ETH_AMOUNT: BigNumber = new BigNumber(0.09);
const ACTIVE_DEPOSIT_ETH_AMOUNT: BigNumber = new BigNumber(0.225);
const REFERRER_BONUS: BigNumber = new BigNumber(0.1);

@Injectable()
export class DepositPointService extends Worker {
  private readonly logger: Logger;
  private readonly pointsPhase1StartTime: Date;
  private readonly pointsEarlyDepositEndTime: Date;
  private readonly pointsPhase1EndTime: Date;
  private readonly pointsStatisticalPeriodSecs: number;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly pointsRepository: PointsRepository,
    private readonly blockRepository: BlockRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository,
    private readonly blockAddressPointRepository: BlockAddressPointRepository,
    private readonly transferRepository: TransferRepository,
    private readonly addressActiveRepository: AddressActiveRepository,
    private readonly referrerRepository: ReferrerRepository,
    private readonly tokenOffChainDataProvider: TokenOffChainDataProvider,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(DepositPointService.name);
    this.pointsPhase1StartTime = new Date(this.configService.get<string>("points.pointsPhase1StartTime"));
    this.pointsEarlyDepositEndTime = new Date(this.configService.get<string>("points.pointsEarlyDepositEndTime"));
    this.pointsPhase1EndTime = new Date(this.configService.get<string>("points.pointsPhase1EndTime"));
    this.pointsStatisticalPeriodSecs = configService.get<number>("points.pointsStatisticalPeriodSecs");
  }

  protected async runProcess(): Promise<void> {
    try {
      await this.handleDeposit();
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

  async handleDeposit() {
    const lastRunBlockNumber = await this.pointsRepository.getLastStatisticalBlockNumber();
    this.logger.log(`Last deposit point statistical block number: ${lastRunBlockNumber}`);
    const currentRunBlock = await this.blockRepository.getLastBlock({
      where: { number: lastRunBlockNumber + 1 },
      select: { number: true, timestamp: true },
    });
    if (!currentRunBlock) {
      return;
    }
    const currentRunBlockNumber = currentRunBlock.number;
    this.logger.log(`Handle deposit point at block: ${currentRunBlockNumber}`);
    // update token price at the block
    const tokenPriceMap = await this.updateTokenPrice(currentRunBlock);

    // handle transfer where type is deposit
    const transfers = await this.transferRepository.getBlockDeposits(currentRunBlock.number);
    this.logger.log(`Block ${currentRunBlock.number} deposit num: ${transfers.length}`);
    if (transfers.length === 0) {
      return;
    }
    for (const transfer of transfers) {
      await this.recordDepositPoint(transfer, tokenPriceMap);
    }
    await this.pointsRepository.setStatisticalBlockNumber(currentRunBlockNumber);
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
      // todo cache the price
      const usdPrice = await this.tokenOffChainDataProvider.getTokenPriceByBlock(priceId, block.timestamp.getTime());
      const entity = {
        blockNumber: block.number,
        priceId,
        usdPrice: usdPrice,
      };
      await this.blockTokenPriceRepository.add(entity);
      return new BigNumber(usdPrice);
    } else {
      return new BigNumber(blockTokenPrice.usdPrice);
    }
  }

  async recordDepositPoint(transfer: Transfer, tokenPrices: Map<string, BigNumber>) {
    const blockNumber: number = transfer.blockNumber;
    const blockTs: Date = new Date(transfer.timestamp);
    const depositReceiver: string = hexTransformer.from(transfer.to);
    const tokenAddress: string = hexTransformer.from(transfer.tokenAddress);
    const tokenAmount: BigNumber = new BigNumber(transfer.amount);
    const transferId: number = transfer.number;
    this.logger.log(
      `Handle deposit: [receiver = ${depositReceiver}, tokenAddress = ${tokenAddress}, tokenAmount = ${tokenAmount}, transferId = ${transferId}]`
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
    const depositResult = await this.calculateDepositPoint(tokenAmount, tokenInfo, tokenPrices);
    const newDepositETHAmount = depositResult[0];
    const newDepositPoint = depositResult[1];

    // active user
    await this.activeUser(blockNumber, blockTs, depositReceiver, newDepositETHAmount);
    // update deposit point for user and refer point for referrer
    await this.updateDepositPoint(blockNumber, depositReceiver, newDepositPoint, transferId);
  }

  async activeUser(blockNumber: number, blockTs: Date, depositReceiver: string, depositETHAmount: BigNumber) {
    if (
      (depositETHAmount.gte(EARLY_ACTIVE_DEPOSIT_ETH_AMOUNT) && blockTs <= this.pointsEarlyDepositEndTime) ||
      (depositETHAmount.gte(ACTIVE_DEPOSIT_ETH_AMOUNT) &&
        blockTs > this.pointsEarlyDepositEndTime &&
        blockTs <= this.pointsPhase1EndTime)
    ) {
      const addressActive = await this.addressActiveRepository.getAddressActive(depositReceiver);
      if (!addressActive) {
        this.logger.log(`Active user: ${depositReceiver}`);
        await this.addressActiveRepository.add({
          address: depositReceiver,
          blockNumber: blockNumber,
        });
      }
    }
  }

  async updateDepositPoint(blockNumber: number, depositReceiver: string, depositPoint: BigNumber, transferId: number) {
    // update point of user
    let receiverBlockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(
      blockNumber,
      depositReceiver
    );
    if (!receiverBlockAddressPoint) {
      receiverBlockAddressPoint = this.blockAddressPointRepository.createDefaultBlockAddressPoint(
        blockNumber,
        depositReceiver
      );
    }
    let receiverAddressPoint = await this.pointsRepository.getPointByAddress(depositReceiver);
    if (!receiverAddressPoint) {
      receiverAddressPoint = this.pointsRepository.createDefaultPoint(depositReceiver);
    }
    receiverBlockAddressPoint.depositPoint = Number(receiverBlockAddressPoint.depositPoint) + depositPoint.toNumber();
    receiverAddressPoint.stakePoint = Number(receiverAddressPoint.stakePoint) + depositPoint.toNumber();
    this.logger.log(`Address ${depositReceiver} get deposit point: ${depositPoint}`);
    // update point of referrer
    let referrerBlockAddressPoint: BlockAddressPoint;
    let referrerAddressPoint: Point;
    const referral = await this.referrerRepository.getReferral(depositReceiver);
    const referrer = referral?.referrer;
    if (!!referrer) {
      referrerBlockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, referrer);
      if (!referrerBlockAddressPoint) {
        referrerBlockAddressPoint = this.blockAddressPointRepository.createDefaultBlockAddressPoint(
          blockNumber,
          referrer
        );
      }
      referrerAddressPoint = await this.pointsRepository.getPointByAddress(referrer);
      if (!referrerAddressPoint) {
        referrerAddressPoint = this.pointsRepository.createDefaultPoint(referrer);
      }
      const referrerBonus = depositPoint.multipliedBy(REFERRER_BONUS);
      referrerBlockAddressPoint.refPoint = Number(referrerBlockAddressPoint.refPoint) + referrerBonus.toNumber();
      referrerAddressPoint.refPoint = Number(referrerAddressPoint.refPoint) + referrerBonus.toNumber();
      this.logger.log(`Referrer ${referrer} get ref point from deposit: ${referrerBonus}`);
    }
    await this.blockAddressPointRepository.upsertUserAndReferrerPoint(
      receiverBlockAddressPoint,
      receiverAddressPoint,
      referrerBlockAddressPoint,
      referrerAddressPoint,
      transferId
    );
  }

  async calculateDepositPoint(
    tokenAmount: BigNumber,
    token: Token,
    tokenPrices: Map<string, BigNumber>
  ): Promise<[BigNumber, BigNumber]> {
    // NOVA Points = 10 * Token multiplier * Deposit Amount * Token Price / ETH price
    const price = this.getTokenPrice(token, tokenPrices);
    const ethPrice = this.getETHPrice(tokenPrices);
    const depositAmount = tokenAmount.dividedBy(new BigNumber(10).pow(token.decimals));
    const depositETHAmount = depositAmount.multipliedBy(price).dividedBy(ethPrice);
    const tokenMultiplier = new BigNumber(token.multiplier);
    const point = DEPOSIT_MULTIPLIER.multipliedBy(tokenMultiplier).multipliedBy(depositETHAmount);
    this.logger.log(
      `Deposit ethAmount = ${depositETHAmount}, point = ${point}, [deposit multiplier = ${DEPOSIT_MULTIPLIER}, token multiplier = ${tokenMultiplier}, deposit amount = ${depositAmount}, token price = ${price}, eth price = ${ethPrice}]`
    );
    return [depositETHAmount, point];
  }

  getTokenPrice(token: Token, tokenPrices: Map<string, BigNumber>): BigNumber {
    let price: BigNumber;
    if (token.type === STABLE_COIN_TYPE) {
      price = new BigNumber(1);
    } else {
      price = tokenPrices.get(token.cgPriceId);
    }
    if (!price) {
      throw new Error(`Token ${token.symbol} price not found`);
    }
    return price;
  }

  getETHPrice(tokenPrices: Map<string, BigNumber>): BigNumber {
    const ethPrice = tokenPrices.get(ETHEREUM_CG_PRICE_ID);
    if (!ethPrice) {
      throw new Error(`Ethereum price not found`);
    }
    return ethPrice;
  }
}
