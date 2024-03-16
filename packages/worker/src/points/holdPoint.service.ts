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
} from "../repositories";
import { TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { BlockAddressPoint, Point } from "../entities";
import { hexTransformer } from "../transformers/hex.transformer";
import { ConfigService } from "@nestjs/config";
import {
  getEarlyBirdMultiplier,
  getETHPrice,
  getGroupBooster,
  getTokenPrice,
  REFERRER_BONUS,
  STABLE_COIN_TYPE,
} from "./depositPoint.service";

type BlockAddressTvl = {
  tvl: BigNumber;
  holdBasePoint: BigNumber;
};

@Injectable()
export class HoldPointService extends Worker {
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
    private readonly balanceRepository: BalanceRepository,
    private readonly inviteRepository: InviteRepository,
    private readonly referrerRepository: ReferrerRepository,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(HoldPointService.name);
    this.pointsPhase1StartTime = new Date(this.configService.get<string>("points.pointsPhase1StartTime"));
    this.pointsEarlyDepositEndTime = new Date(this.configService.get<string>("points.pointsEarlyDepositEndTime"));
    this.pointsPhase1EndTime = new Date(this.configService.get<string>("points.pointsPhase1EndTime"));
    this.pointsStatisticalPeriodSecs = configService.get<number>("points.pointsStatisticalPeriodSecs");
  }

  protected async runProcess(): Promise<void> {
    try {
      await this.handleHoldPoint();
    } catch (err) {
      this.logger.error({
        message: "Failed to calculate point",
        originalError: err,
      });
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
    const currentStatisticalBlock = await this.blockRepository.getNextHoldPointStatisticalBlock(
      lastStatisticalTs,
      currentStatisticalTs
    );
    if (!!currentStatisticalBlock) {
      this.logger.log(`Wait for the next hold point statistical block`);
      return;
    }
    const lastDepositStatisticalBlockNumber = await this.pointsRepository.getLastStatisticalBlockNumber();
    if (lastDepositStatisticalBlockNumber < currentStatisticalBlock.number) {
      this.logger.log(`Wait deposit statistic finish`);
      return;
    }

    this.logger.log(`Statistic hold point at block: ${currentStatisticalBlock.number}`);
    const tokenPriceMap = await this.getTokenPriceMap(currentStatisticalBlock.number);
    const addressTvlMap = await this.getAddressTvlMap(currentStatisticalBlock.number, tokenPriceMap);
    const groupTvlMap = await this.getGroupTvlMap(currentStatisticalBlock.number, addressTvlMap);
    for (const address in addressTvlMap) {
      const fromBlockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(
        currentStatisticalBlock.number,
        address
      );
      if (!!fromBlockAddressPoint && fromBlockAddressPoint.holdPoint > 0) {
        this.logger.log(`Address hold point calculated: ${address}`);
        continue;
      }
      const addressTvl = addressTvlMap.get(address);
      const earlyBirdMultiplier = new BigNumber(getEarlyBirdMultiplier(currentStatisticalBlock.timestamp));
      let groupBooster = new BigNumber(1);
      const invite = await this.inviteRepository.getInvite(address);
      if (!!invite) {
        const groupTvl = groupTvlMap.get(invite.groupId);
        if (!!groupTvl) {
          groupBooster = groupBooster.plus(getGroupBooster(groupTvl));
        }
      }
      // NOVA Point = sum_all tokens in activity list (Early_Bird_Multiplier * Token Multiplier * Token Amount * Token Price * (1 + Group Booster + Growth Booster) / ETH_Price )
      const newHoldPoint = addressTvl.holdBasePoint.multipliedBy(earlyBirdMultiplier).multipliedBy(groupBooster);
      await this.updateHoldPoint(currentStatisticalBlock.number, address, newHoldPoint);
    }
    await this.pointsRepository.setHoldPointStatisticalBlockNumber(currentStatisticalBlock.number);
  }

  async getAddressTvlMap(
    blockNumber: number,
    tokenPriceMap: Map<string, BigNumber>
  ): Promise<Map<string, BlockAddressTvl>> {
    const addressTvlMap: Map<string, BlockAddressTvl> = new Map();
    const addressBufferList = await this.balanceRepository.getAllAddressesByBlock(blockNumber);
    this.logger.log(`The address list length: ${addressBufferList.length}`);
    for (const addressBuffer of addressBufferList) {
      const address = hexTransformer.from(addressBuffer);
      const addressTvl = await this.calculateAddressTvl(address, blockNumber, tokenPriceMap);
      if (addressTvl.tvl.gte(new BigNumber(0))) {
        this.logger.log(`Address ${address}: [tvl: ${addressTvl.tvl}, holdBasePoint: ${addressTvl.holdBasePoint}]`);
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
        continue;
      }
      const tokenPrice = getTokenPrice(tokenInfo, tokenPrices);
      const ethPrice = getETHPrice(tokenPrices);
      const tokenAmount = new BigNumber(addressBalance.balance).dividedBy(new BigNumber(10).pow(tokenInfo.decimals));
      const tokenTvl = tokenAmount.multipliedBy(tokenPrice);
      // base point = Token Multiplier * Token Amount * Token Price / ETH_Price
      const tokenHoldBasePoint = tokenTvl.multipliedBy(new BigNumber(tokenInfo.multiplier)).dividedBy(ethPrice);
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
      const members = await this.inviteRepository.getGroupMembers(groupId);
      for (const member of members) {
        const memberTvl = addressTvlMap.get(member);
        if (!!memberTvl) {
          groupTvl = groupTvl.plus(memberTvl.tvl);
        }
      }
      if (groupTvl.gte(new BigNumber(0))) {
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
    fromBlockAddressPoint.holdPoint = Number(fromBlockAddressPoint.holdPoint) + holdPoint.toNumber();
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
}
