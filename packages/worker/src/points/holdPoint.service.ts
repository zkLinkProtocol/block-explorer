import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import {
  PointsRepository,
  BlockRepository,
  BalanceRepository,
  BlockTokenPriceRepository,
  BlockAddressPointRepository,
  InviteRepository,
  ReferrerRepository,
  AddressFirstDepositRepository,
  TransferRepository,
} from "../repositories";
import { TokenMultiplier, TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { BlockAddressPoint, Point } from "../entities";
import { hexTransformer } from "../transformers/hex.transformer";
import { ConfigService } from "@nestjs/config";
import { getETHPrice, getTokenPrice, REFERRER_BONUS, STABLE_COIN_TYPE } from "./depositPoint.service";
import addressMultipliers from "../addressMultipliers";
import { AddressFirstDeposit } from "../entities/addressFirstDeposit.entity";

type BlockAddressTvl = {
  tvl: BigNumber;
  holdBasePoint: BigNumber;
};

@Injectable()
export class HoldPointService extends Worker {
  private readonly logger: Logger;
  private readonly pointsStatisticalPeriodSecs: number;
  private readonly pointsPhase1StartTime: Date;
  private readonly addressMultipliersCache: Map<string, TokenMultiplier[]>;
  private readonly withdrawStartTime: Date;
  private addressFirstDepositTimeCache: Map<string, Date>;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly pointsRepository: PointsRepository,
    private readonly blockRepository: BlockRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository,
    private readonly blockAddressPointRepository: BlockAddressPointRepository,
    private readonly balanceRepository: BalanceRepository,
    private readonly inviteRepository: InviteRepository,
    private readonly referrerRepository: ReferrerRepository,
    private readonly addressFirstDepositRepository: AddressFirstDepositRepository,
    private readonly transferRepository: TransferRepository,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(HoldPointService.name);
    this.pointsStatisticalPeriodSecs = this.configService.get<number>("points.pointsStatisticalPeriodSecs");
    this.pointsPhase1StartTime = new Date(this.configService.get<string>("points.pointsPhase1StartTime"));
    this.addressMultipliersCache = new Map<string, TokenMultiplier[]>();
    for (const m of addressMultipliers) {
      this.addressMultipliersCache.set(m.address.toLowerCase(), m.multipliers);
    }
    const endDate = new Date(this.pointsPhase1StartTime);
    this.withdrawStartTime = new Date(endDate.setMonth(endDate.getMonth() + 1));
    this.addressFirstDepositTimeCache = new Map();
  }

  protected async runProcess(): Promise<void> {
    try {
      await this.handleHoldPoint();
    } catch (error) {
      this.logger.error("Failed to calculate hold point", error.stack);
    }

    await waitFor(() => !this.currentProcessPromise, 60000, 60000);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }

  async handleHoldPoint() {
    // hold point statistical block number start from 1
    const lastStatisticalBlockNumber = await this.pointsRepository.getLastHoldPointStatisticalBlockNumber();
    const lastStatisticalBlock = await this.blockRepository.getLastBlock({
      where: { number: lastStatisticalBlockNumber },
      select: { number: true, timestamp: true },
    });
    if (!lastStatisticalBlock) {
      throw new Error(`Last hold point statistical block not found: ${lastStatisticalBlockNumber}`);
    }
    const lastStatisticalTs = lastStatisticalBlock.timestamp;
    const currentStatisticalTs = new Date(lastStatisticalTs.getTime() + this.pointsStatisticalPeriodSecs * 1000);
    const currentStatisticalBlock = await this.blockRepository.getNextHoldPointStatisticalBlock(currentStatisticalTs);
    if (!currentStatisticalBlock) {
      this.logger.log(`Wait for the next hold point statistical block`);
      return;
    }
    const lastDepositStatisticalBlockNumber = await this.pointsRepository.getLastStatisticalBlockNumber();
    if (lastDepositStatisticalBlockNumber < currentStatisticalBlock.number) {
      this.logger.log(`Wait deposit statistic finish`);
      return;
    }

    const sinceLastTime = currentStatisticalBlock.timestamp.getTime() - lastStatisticalTs.getTime();
    this.logger.log(
      `Statistic hold point at block: ${currentStatisticalBlock.number}, since last: ${sinceLastTime / 1000} seconds`
    );
    const statisticStartTime = new Date();
    const earlyBirdMultiplier = this.getEarlyBirdMultiplier(currentStatisticalBlock.timestamp);
    this.logger.log(`Early bird multiplier: ${earlyBirdMultiplier}`);
    const tokenPriceMap = await this.getTokenPriceMap(currentStatisticalBlock.number);
    const blockTs = currentStatisticalBlock.timestamp.getTime();
    const addressTvlMap = await this.getAddressTvlMap(currentStatisticalBlock.number, blockTs, tokenPriceMap);
    const groupTvlMap = await this.getGroupTvlMap(currentStatisticalBlock.number, addressTvlMap);
    let updateFirstDepositDb = false;
    const updateFirstDeposits: Array<AddressFirstDeposit> = [];
    if (this.isWithdrawStartPhase(blockTs) && this.addressFirstDepositTimeCache.size == 0) {
      this.addressFirstDepositTimeCache = await this.getAddressFirstDepositMap();
      if (this.addressFirstDepositTimeCache.size < addressTvlMap.size) {
        const leftFirstDepositAddresses: Array<string> = [];
        addressTvlMap.forEach((tvl, address) => {
          if (!this.addressFirstDepositTimeCache.has(address)) {
            leftFirstDepositAddresses.push(address);
          }
        });
        this.logger.log(`Get first deposits from transfers table ${leftFirstDepositAddresses.length}`);
        const leftFirstDepositMap = await this.getFirstDepositMapFromTransfer(leftFirstDepositAddresses);
        for (const [address, firstDepositTime] of leftFirstDepositMap) {
          this.addressFirstDepositTimeCache.set(address, firstDepositTime);
          updateFirstDeposits.push({
            address,
            firstDepositTime,
          });
        }
        if (updateFirstDeposits.length > 0) {
          updateFirstDepositDb = true;
        }
      }
    }
    for (const address of addressTvlMap.keys()) {
      const fromBlockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(
        currentStatisticalBlock.number,
        address
      );
      if (!!fromBlockAddressPoint && fromBlockAddressPoint.holdPoint > 0) {
        this.logger.log(`Address hold point calculated: ${address}`);
        continue;
      }
      const addressTvl = addressTvlMap.get(address);
      let groupBooster = new BigNumber(1);
      const addressMultiplier = this.getAddressMultiplier(address, blockTs);
      const invite = await this.inviteRepository.getInvite(address);
      if (!!invite) {
        const groupTvl = groupTvlMap.get(invite.groupId);
        if (!!groupTvl) {
          groupBooster = groupBooster.plus(this.getGroupBooster(groupTvl));
        }
      }
      let firstDepositTime = this.addressFirstDepositTimeCache.get(address);
      if (!!firstDepositTime) {
        const addressFirstDeposit = await this.addressFirstDepositRepository.getAddressFirstDeposit(address);
        firstDepositTime = addressFirstDeposit?.firstDepositTime;
        if (firstDepositTime) {
          this.addressFirstDepositTimeCache.set(address, firstDepositTime);
        }
      }
      const loyaltyBooster = this.getLoyaltyBooster(blockTs, firstDepositTime?.getTime());
      // NOVA Point = sum_all tokens in activity list (Early_Bird_Multiplier * Token Multiplier * Address Multiplier * Token Amount * Token Price * (1 + Group Booster + Growth Booster) * Loyalty Booster / ETH_Price )
      const newHoldPoint = addressTvl.holdBasePoint
        .multipliedBy(earlyBirdMultiplier)
        .multipliedBy(groupBooster)
        .multipliedBy(addressMultiplier)
        .multipliedBy(loyaltyBooster);
      await this.updateHoldPoint(currentStatisticalBlock.number, address, newHoldPoint);
    }
    await this.pointsRepository.setHoldPointStatisticalBlockNumber(currentStatisticalBlock.number);
    if (updateFirstDepositDb) {
      await this.addressFirstDepositRepository.addMany(updateFirstDeposits);
    }
    const statisticEndTime = new Date();
    const statisticElapsedTime = statisticEndTime.getTime() - statisticStartTime.getTime();
    this.logger.log(
      `Finish hold point statistic for block: ${currentStatisticalBlock.number}, elapsed time: ${
        statisticElapsedTime / 1000
      } seconds`
    );
  }

  async getAddressFirstDepositMap(): Promise<Map<string, Date>> {
    const addressFirstDepositMap: Map<string, Date> = new Map();
    const addressFirstDeposits = await this.addressFirstDepositRepository.getAllAddressFirstDeposits();
    for (const deposit of addressFirstDeposits) {
      addressFirstDepositMap.set(deposit.address, deposit.firstDepositTime);
    }
    return addressFirstDepositMap;
  }

  async getFirstDepositMapFromTransfer(addresses: string[]): Promise<Map<string, Date>> {
    const addressFirstDepositMap: Map<string, Date> = new Map();
    for (const address of addresses) {
      const firstDeposit = await this.transferRepository.getAddressFirstDeposit(address);
      if (firstDeposit) {
        let firstDepositTs = new Date(firstDeposit.timestamp);
        const pointsStartTs = this.pointsPhase1StartTime;
        if (firstDepositTs.getTime() < pointsStartTs.getTime()) {
          firstDepositTs = new Date(pointsStartTs);
        }
        addressFirstDepositMap.set(address, new Date(firstDeposit.timestamp));
      }
    }
    return addressFirstDepositMap;
  }

  async getAddressTvlMap(
    blockNumber: number,
    blockTs: number,
    tokenPriceMap: Map<string, BigNumber>
  ): Promise<Map<string, BlockAddressTvl>> {
    const addressTvlMap: Map<string, BlockAddressTvl> = new Map();
    const addressBufferList = await this.balanceRepository.getAllAddressesByBlock(blockNumber);
    this.logger.log(`The address list length: ${addressBufferList.length}`);
    for (const addressBuffer of addressBufferList) {
      const address = hexTransformer.from(addressBuffer);
      const addressTvl = await this.calculateAddressTvl(address, blockNumber, tokenPriceMap, blockTs);
      if (addressTvl.tvl.gt(new BigNumber(0))) {
        this.logger.log(`Address ${address}: [tvl: ${addressTvl.tvl}, holdBasePoint: ${addressTvl.holdBasePoint}]`);
      }
      addressTvlMap.set(address, addressTvl);
    }
    return addressTvlMap;
  }

  public getAddressMultiplier(address: string, blockTs: number): BigNumber {
    const multipliers = this.addressMultipliersCache.get(address.toLowerCase());
    if (!multipliers || multipliers.length == 0) {
      return new BigNumber(1);
    }
    multipliers.sort((a, b) => b.timestamp - a.timestamp);
    for (const m of multipliers) {
      if (blockTs >= m.timestamp * 1000) {
        return new BigNumber(m.multiplier);
      }
    }
    return new BigNumber(multipliers[multipliers.length - 1].multiplier);
  }

  async calculateAddressTvl(
    address: string,
    blockNumber: number,
    tokenPrices: Map<string, BigNumber>,
    blockTs: number
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
        continue;
      }
      const tokenPrice = getTokenPrice(tokenInfo, tokenPrices);
      const ethPrice = getETHPrice(tokenPrices);
      const tokenAmount = new BigNumber(addressBalance.balance).dividedBy(new BigNumber(10).pow(tokenInfo.decimals));
      const tokenTvl = tokenAmount.multipliedBy(tokenPrice).dividedBy(ethPrice);
      // base point = Token Multiplier * Token Amount * Token Price / ETH_Price
      const tokenMultiplier = this.tokenService.getTokenMultiplier(tokenInfo, blockTs);
      const tokenHoldBasePoint = tokenTvl.multipliedBy(new BigNumber(tokenMultiplier));
      tvl = tvl.plus(tokenTvl);
      holdBasePoint = holdBasePoint.plus(tokenHoldBasePoint);
    }
    return {
      tvl,
      holdBasePoint,
    };
  }

  async getGroupTvlMap(
    blockNumber: number,
    addressTvlMap: Map<string, BlockAddressTvl>
  ): Promise<Map<string, BigNumber>> {
    const groupTvlMap = new Map<string, BigNumber>();
    const allGroupIds = await this.inviteRepository.getAllGroups();
    this.logger.log(`All group length: ${allGroupIds.length}`);
    for (const groupId of allGroupIds) {
      let groupTvl = new BigNumber(0);
      const members = await this.inviteRepository.getGroupMembersByBlock(groupId, blockNumber);
      for (const member of members) {
        const memberTvl = addressTvlMap.get(member);
        if (!!memberTvl) {
          groupTvl = groupTvl.plus(memberTvl.tvl);
        }
      }
      if (groupTvl.gt(new BigNumber(0))) {
        this.logger.log(`Group ${groupId} tvl: ${groupTvl}`);
      }
      groupTvlMap.set(groupId, new BigNumber(groupTvl));
    }
    return groupTvlMap;
  }

  async getTokenPriceMap(blockNumber: number): Promise<Map<string, BigNumber>> {
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
      const blockTokenPrice = await this.blockTokenPriceRepository.getBlockTokenPrice(blockNumber, priceId);
      if (!blockTokenPrice) {
        throw new Error(`Token ${priceId} price not found`);
      }
      tokenPrices.set(priceId, new BigNumber(blockTokenPrice.usdPrice));
    }
    return tokenPrices;
  }

  async updateHoldPoint(blockNumber: number, from: string, holdPoint: BigNumber) {
    // update point of user
    let fromBlockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, from);
    if (!fromBlockAddressPoint) {
      fromBlockAddressPoint = this.blockAddressPointRepository.createDefaultBlockAddressPoint(blockNumber, from);
    }
    let fromAddressPoint = await this.pointsRepository.getPointByAddress(from);
    if (!fromAddressPoint) {
      fromAddressPoint = this.pointsRepository.createDefaultPoint(from);
    }
    fromBlockAddressPoint.holdPoint = holdPoint.toNumber();
    fromAddressPoint.stakePoint = Number(fromAddressPoint.stakePoint) + holdPoint.toNumber();
    this.logger.log(`Address ${from} get hold point: ${holdPoint}`);
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
      const referrerBonus = holdPoint.multipliedBy(REFERRER_BONUS);
      referrerBlockAddressPoint.refPoint = Number(referrerBlockAddressPoint.refPoint) + referrerBonus.toNumber();
      referrerAddressPoint.refPoint = Number(referrerAddressPoint.refPoint) + referrerBonus.toNumber();
      this.logger.log(`Referrer ${referrer} get ref point from hold: ${referrerBonus}`);
    }
    await this.blockAddressPointRepository.upsertUserAndReferrerPoint(
      fromBlockAddressPoint,
      fromAddressPoint,
      referrerBlockAddressPoint,
      referrerAddressPoint
    );
  }

  isWithdrawStartPhase(blockTs: number): boolean {
    return blockTs >= this.withdrawStartTime.getTime();
  }

  getLoyaltyBooster(blockTs: number, firstDepositTs: number | null): BigNumber {
    if (!this.isWithdrawStartPhase(blockTs)) {
      return new BigNumber(1);
    }

    if (!firstDepositTs) {
      return new BigNumber(1);
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const diffInMilliseconds = blockTs - firstDepositTs;
    const loyaltyDays = Math.floor(diffInMilliseconds / millisecondsPerDay);
    const loyaltyBooster = (loyaltyDays * 5.0) / 1000.0;
    return new BigNumber(loyaltyBooster).plus(1);
  }

  getEarlyBirdMultiplier(blockTs: Date): BigNumber {
    // 1st week: 2,second week:1.5,third,forth week ~ within 1 month :1.2,1 month later: 1,
    const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
    const startDate = this.pointsPhase1StartTime;
    const diffInMilliseconds = blockTs.getTime() - startDate.getTime();
    const diffInWeeks = Math.floor(diffInMilliseconds / millisecondsPerWeek);
    if (diffInWeeks < 1) {
      return new BigNumber(2);
    } else if (diffInWeeks < 2) {
      return new BigNumber(1.5);
    } else if (!this.isWithdrawStartPhase(blockTs.getTime())) {
      return new BigNumber(1.2);
    } else {
      return new BigNumber(1);
    }
  }

  getGroupBooster(groupTvl: BigNumber): BigNumber {
    if (groupTvl.gte(5000)) {
      return new BigNumber(0.5);
    } else if (groupTvl.gte(1000)) {
      return new BigNumber(0.4);
    } else if (groupTvl.gte(500)) {
      return new BigNumber(0.3);
    } else if (groupTvl.gte(100)) {
      return new BigNumber(0.2);
    } else if (groupTvl.gte(20)) {
      return new BigNumber(0.1);
    } else {
      return new BigNumber(0);
    }
  }
}
