import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import { PointsRepository, BlockRepository, TransferRepository, BalanceRepository } from "../repositories";
import { TokenOffChainDataProvider } from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import { Token, TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { Block, BlockAddressPoint, Point, Transfer, AddressTvl } from "../entities";
import { BlockTokenPriceRepository } from "../repositories/blockTokenPrice.repository";
import { BlockAddressPointRepository } from "../repositories/blockAddressPoint.repository";
import { hexTransformer } from "../transformers/hex.transformer";
import { ConfigService } from "@nestjs/config";
import { InviteRepository } from "../repositories/invite.repository";
import { AddressActiveRepository } from "../repositories/addressActive.repository";
import { ReferrerRepository } from "../repositories/referrer.repository";
import { BlockGroupTvlRepository } from "../repositories/blockGroupTvl.repository";
import { GroupTvlRepository } from "../repositories/groupTvl.repository";
import { AddressTvlRepository } from "../repositories/addressTvl.repository";

const STABLE_COIN_TYPE = "Stablecoin";
const ETHEREUM_CG_PRICE_ID = "ethereum";
const DEPOSIT_MULTIPLIER: BigNumber = new BigNumber(10);
const EARLY_ACTIVE_DEPOSIT_ETH_AMOUNT: BigNumber = new BigNumber(0.09);
const ACTIVE_DEPOSIT_ETH_AMOUNT: BigNumber = new BigNumber(0.225);
const REFERRER_BONUS: BigNumber = new BigNumber(0.1);

type BlockAddressTvl = {
  tvl: BigNumber;
  holdBasePoint: BigNumber;
};

@Injectable()
export class PointService extends Worker {
  private readonly logger: Logger;
  private readonly pointsPhase1StartTime: Date;
  public constructor(
    private readonly tokenService: TokenService,
    private readonly pointsRepository: PointsRepository,
    private readonly blockRepository: BlockRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository,
    private readonly blockAddressPointRepository: BlockAddressPointRepository,
    private readonly transferRepository: TransferRepository,
    private readonly balanceRepository: BalanceRepository,
    private readonly addressActiveRepository: AddressActiveRepository,
    private readonly inviteRepository: InviteRepository,
    private readonly referrerRepository: ReferrerRepository,
    private readonly blockGroupTvlRepository: BlockGroupTvlRepository,
    private readonly groupTvlRepository: GroupTvlRepository,
    private readonly addressTvlRepository: AddressTvlRepository,
    private readonly tokenOffChainDataProvider: TokenOffChainDataProvider,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(PointService.name);
    this.pointsPhase1StartTime = new Date(this.configService.get<string>("points.pointsPhase1StartTime"));
    this.pointsEarlyDepositEndTime = new Date(this.configService.get<string>("points.pointsEarlyDepositEndTime"));
    this.pointsPhase1EndTime = new Date(this.configService.get<string>("points.pointsPhase1EndTime"));
    this.logger.log(`Phase 1 start time: ${this.pointsPhase1StartTime}`);
    this.logger.log(`Early deposit end time: ${this.pointsEarlyDepositEndTime}`);
    this.logger.log(`Phase 1 end time: ${this.pointsPhase1EndTime}`);
  }
  private readonly pointsEarlyDepositEndTime: Date;

  private readonly pointsPhase1EndTime: Date;

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
        const addressTvlMap = await this.getAddressTvl(currentRunBlockNumber, tokenPrices);
        const groupTvlMap = await this.getGroupTvl(currentRunBlockNumber, addressTvlMap);
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
    const blockTs: Date = new Date(transfer.timestamp);
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
    const depositResult = await this.calculateDepositPoint(tokenAmount, tokenInfo, tokenPrices);
    const newDepositETHAmount = depositResult[0];
    const newDepositPoint = depositResult[1];

    // active user
    await this.activeUser(blockNumber, blockTs, from, newDepositETHAmount);
    // update deposit point for user and refer point for referrer
    await this.updateDepositPoint(blockNumber, from, newDepositPoint, transferId);
  }

  async activeUser(blockNumber: number, blockTs: Date, from: string, depositETHAmount: BigNumber) {
    if (
      (depositETHAmount.gte(EARLY_ACTIVE_DEPOSIT_ETH_AMOUNT) && blockTs <= this.pointsEarlyDepositEndTime) ||
      (depositETHAmount.gte(ACTIVE_DEPOSIT_ETH_AMOUNT) &&
        blockTs > this.pointsEarlyDepositEndTime &&
        blockTs <= this.pointsPhase1EndTime)
    ) {
      const addressActive = await this.addressActiveRepository.getAddressActive(from);
      if (!addressActive) {
        this.logger.log(`Active user: ${from}`);
        await this.addressActiveRepository.add({
          address: from,
          blockNumber: blockNumber,
        });
      }
    }
  }

  async updateDepositPoint(blockNumber: number, from: string, depositPoint: BigNumber, transferId: number) {
    // update point of user
    let fromBlockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, from);
    if (!fromBlockAddressPoint) {
      fromBlockAddressPoint = this.blockAddressPointRepository.createDefaultBlockAddressPoint(blockNumber, from);
    }
    let fromAddressPoint = await this.pointsRepository.getPointByAddress(from);
    if (!fromAddressPoint) {
      fromAddressPoint = this.pointsRepository.createDefaultPoint(from);
    }
    fromBlockAddressPoint.depositPoint = Number(fromBlockAddressPoint.depositPoint) + depositPoint.toNumber();
    fromAddressPoint.stakePoint = Number(fromBlockAddressPoint.depositPoint) + depositPoint.toNumber();
    // update point of referrer
    let referrerBlockAddressPoint: BlockAddressPoint;
    let referrerAddressPoint: Point;
    const referral = await this.referrerRepository.getReferral(from);
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
      this.logger.log(`Referrer ${referrer} get ref point: ${referrerBonus}`);
    }
    await this.blockAddressPointRepository.upsertUserAndReferrerPoint(
      fromBlockAddressPoint,
      fromAddressPoint,
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

  async getAddressTvl(blockNumber: number, tokenPrices: Map<string, BigNumber>): Promise<Map<string, BlockAddressTvl>> {
    const addressTvlMap: Map<string, BlockAddressTvl> = new Map();
    const addressBufferList = await this.balanceRepository.getAllAddressesByBlock(blockNumber);
    this.logger.log(`The address list length: ${addressBufferList.length}`);
    for (const addressBuffer of addressBufferList) {
      const address = hexTransformer.from(addressBuffer);
      this.logger.log(`Get address tvl: ${address}`);
      const blockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, address);
      let addressTvl: BlockAddressTvl;
      if (!!blockAddressPoint && blockAddressPoint.tvl > 0) {
        this.logger.log(`Address tvl calculated: ${address}`);
        addressTvl = {
          tvl: new BigNumber(blockAddressPoint.tvl),
          holdBasePoint: new BigNumber(blockAddressPoint.holdBasePoint),
        };
      } else {
        addressTvl = await this.calculateAddressTvl(address, blockNumber, tokenPrices);
      }
      addressTvlMap.set(address, addressTvl);
    }
    return addressTvlMap;
  }

  async calculateAddressTvl(
    address: string,
    blockNumber: number,
    tokenPrices: Map<string, BigNumber>
  ): Promise<BlockAddressTvl> {
    const addressBuffer: Buffer = hexTransformer.to(address);
    const addressBalances = await this.balanceRepository.getAccountBalancesByBlock(addressBuffer, blockNumber);
    let tvl: BigNumber = new BigNumber(0);
    let holdBasePoint: BigNumber = new BigNumber(0);
    for (const addressBalance of addressBalances) {
      // filter not support token
      const tokenAddress: string = hexTransformer.from(addressBalance.tokenAddress);
      const tokenInfo = this.tokenService.getSupportToken(tokenAddress);
      if (!tokenInfo) {
        this.logger.log(`Token ${tokenAddress} not support for point`);
        continue;
      }
      const tokenPrice = this.getTokenPrice(tokenInfo, tokenPrices);
      const ethPrice = this.getETHPrice(tokenPrices);
      const tokenAmount = new BigNumber(addressBalance.balance).dividedBy(new BigNumber(10).pow(tokenInfo.decimals));
      const tokenTvl = tokenAmount.multipliedBy(tokenPrice);
      // base point = Token Multiplier * Token Amount * Token Price / ETH_Price
      const tokenHoldBasePoint = tokenTvl.multipliedBy(new BigNumber(tokenInfo.multiplier)).dividedBy(ethPrice);
      tvl = tvl.plus(tokenTvl);
      holdBasePoint = holdBasePoint.plus(tokenHoldBasePoint);
    }
    let blockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, address);
    if (!blockAddressPoint) {
      blockAddressPoint = this.blockAddressPointRepository.createDefaultBlockAddressPoint(blockNumber, address);
    }
    blockAddressPoint.tvl = tvl.toNumber();
    blockAddressPoint.holdBasePoint = holdBasePoint.toNumber();
    // update user and referrer address tvl
    let addressTvl = await this.addressTvlRepository.getAddressTvl(address);
    if (!addressTvl) {
      addressTvl = this.addressTvlRepository.createDefaultAddressTvl(address);
    }
    addressTvl.tvl = Number(addressTvl.tvl) + blockAddressPoint.tvl;
    const referral = await this.referrerRepository.getReferral(address);
    const referrer = referral?.referrer;
    let referrerAddressTvl: AddressTvl;
    if (!!referrer) {
      referrerAddressTvl = await this.addressTvlRepository.getAddressTvl(referrer);
      if (!referrerAddressTvl) {
        referrerAddressTvl = this.addressTvlRepository.createDefaultAddressTvl(referrer);
      }
      referrerAddressTvl.referralTvl = Number(referrerAddressTvl.referralTvl) + blockAddressPoint.tvl;
      this.logger.log(`Referrer ${referrer} get ref tvl: ${blockAddressPoint.tvl}`);
    }
    await this.blockAddressPointRepository.upsertUserAndReferrerTvl(blockAddressPoint, addressTvl, referrerAddressTvl);
    return {
      tvl,
      holdBasePoint,
    };
  }

  async getGroupTvl(blockNumber: number, addressTvlMap: Map<string, BlockAddressTvl>): Promise<Map<string, BigNumber>> {
    const groupTvlMap = new Map<string, BigNumber>();
    const allGroupIds = await this.inviteRepository.getAllGroups();
    for (const groupId of allGroupIds) {
      let blockGroupTvl = await this.blockGroupTvlRepository.getGroupTvl(blockNumber, groupId);
      if (!blockGroupTvl) {
        let tvl = new BigNumber(0);
        const members = await this.inviteRepository.getGroupMembers(groupId);
        for (const member of members) {
          const memberTvl = addressTvlMap.get(member);
          if (!!memberTvl) {
            tvl = tvl.plus(memberTvl.tvl);
          }
        }
        blockGroupTvl = this.blockGroupTvlRepository.createDefaultBlockGroupTvl(blockNumber, groupId, tvl.toNumber());
        let groupTvl = await this.groupTvlRepository.getGroupTvl(groupId);
        if (!groupTvl) {
          groupTvl = this.groupTvlRepository.createDefaultGroupTvl(groupId);
        }
        groupTvl.tvl = Number(groupTvl.tvl) + tvl.toNumber();
        this.logger.log(`Block group tvl: ${blockGroupTvl.tvl}, group total tvl ${groupTvl.tvl}`);
        await this.blockGroupTvlRepository.upsertGroupTvl(blockGroupTvl, groupTvl);
        groupTvlMap.set(groupId, new BigNumber(groupTvl.tvl));
      } else {
        const groupTvl = await this.groupTvlRepository.getGroupTvl(groupId);
        groupTvlMap.set(groupId, new BigNumber(groupTvl.tvl));
      }
    }
    return groupTvlMap;
  }

  async handleHoldPoint(
    blockNumber: number,
    blockTs: Date,
    addressTvlMap: Map<string, BlockAddressTvl>,
    groupTvlMap: Map<string, BigNumber>
  ) {
    for (const address in addressTvlMap) {
      const addressTvl = addressTvlMap.get(address);
      const earlyBirdMultiplier = new BigNumber(this.getEarlyBirdMultiplier(blockTs));
      const groupId = "1";
      const groupBooster = new BigNumber(this.getGroupBooster(groupTvlMap.get(groupId).toNumber())).plus(
        new BigNumber(1)
      );
      const newHoldPoint = addressTvl.holdBasePoint.multipliedBy(earlyBirdMultiplier).multipliedBy(groupBooster);
      // save to db
      // todo 同步更新邀请人的invite point
      // todo 同步更新两个address的总表
    }
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

  getEarlyBirdMultiplier(blockTs: Date): number {
    // 1st week: 2,second week:1.5,third,forth week:1.2,
    const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
    const startDate = this.pointsPhase1StartTime;
    const diffInMilliseconds = blockTs.getTime() - startDate.getTime();
    const diffInWeeks = Math.floor(diffInMilliseconds / millisecondsPerWeek);
    if (diffInWeeks < 1) {
      return 2;
    } else if (diffInWeeks < 2) {
      return 1.5;
    } else if (diffInWeeks < 4) {
      return 1.2;
    } else {
      return 1;
    }
  }

  public getGroupBooster(groupTvl: number): number {
    if (groupTvl > 20) {
      return 0.1;
    } else if (groupTvl > 100) {
      return 0.2;
    } else if (groupTvl > 500) {
      return 0.3;
    } else if (groupTvl > 1000) {
      return 0.4;
    } else if (groupTvl > 5000) {
      return 0.5;
    } else {
      return 0;
    }
  }
}
