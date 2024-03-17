import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import {
  BalanceRepository,
  AddressTvlRepository,
  InviteRepository,
  GroupTvlRepository,
  ReferrerRepository,
} from "../repositories";
import { TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { hexTransformer } from "../transformers/hex.transformer";
import { ConfigService } from "@nestjs/config";
import { getETHPrice, getTokenPrice, STABLE_COIN_TYPE } from "./depositPoint.service";
import { TokenOffChainDataProvider } from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";

@Injectable()
export class TvlStatisticalService extends Worker {
  private readonly logger: Logger;
  private readonly pointsStatisticalTvlPeriodSecs: number;
  private lastTvlStatisticalTime: Date;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly balanceRepository: BalanceRepository,
    private readonly addressTvlRepository: AddressTvlRepository,
    private readonly inviteRepository: InviteRepository,
    private readonly groupTvlRepository: GroupTvlRepository,
    private readonly referrerRepository: ReferrerRepository,
    private readonly tokenOffChainDataProvider: TokenOffChainDataProvider,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(TvlStatisticalService.name);
    this.pointsStatisticalTvlPeriodSecs = this.configService.get<number>("points.pointsStatistsTvlInterval");
    this.lastTvlStatisticalTime = new Date(0);
  }

  protected async runProcess(): Promise<void> {
    try {
      await this.handleTvlStatistical();
    } catch (err) {
      this.logger.error({
        message: "Failed to calculate tvl",
        originalError: err,
      });
    }

    await waitFor(() => !this.currentProcessPromise, 60000, 60000);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }

  async handleTvlStatistical() {
    this.logger.log(`Last deposit tvl statistical time: ${this.lastTvlStatisticalTime}`);
    const now = new Date();
    const nextStatisticalTime = new Date(
      this.lastTvlStatisticalTime.getTime() + this.pointsStatisticalTvlPeriodSecs * 1000
    );
    if (now.getTime() < nextStatisticalTime.getTime()) {
      return;
    }
    this.logger.log(`Handle tvl statistical at: ${now}`);
    const tokenPriceMap = await this.getTokenPriceMap();
    const addressTvlMap = await this.updateAddressTvl(tokenPriceMap);
    await this.updateReferralTvl(addressTvlMap);
    await this.updateGroupTvl(addressTvlMap);
    this.lastTvlStatisticalTime = now;
  }

  async getTokenPriceMap(): Promise<Map<string, BigNumber>> {
    const allSupportTokens = this.tokenService.getAllSupportTokens();
    const allPriceIds: Set<string> = new Set();
    // do not need to get the price of stable coin(they are default 1 usd)
    allSupportTokens.map((t) => {
      if (t.type !== STABLE_COIN_TYPE) {
        allPriceIds.add(t.cgPriceId);
      }
    });
    const tokenPrices: Map<string, BigNumber> = new Map();
    const prices = await this.tokenOffChainDataProvider.getTokensCurrentPrice(Array.from(allPriceIds));
    for (const price of prices) {
      this.logger.log(`Token ${price.priceId} current price: ${price.usdPrice}`);
      tokenPrices.set(price.priceId, new BigNumber(price.usdPrice));
    }
    return tokenPrices;
  }

  async updateAddressTvl(tokenPrices: Map<string, BigNumber>): Promise<Map<string, BigNumber>> {
    const addressTvlMap: Map<string, BigNumber> = new Map();
    const addressBufferList = await this.balanceRepository.getAllAddresses();
    this.logger.log(`The address list length: ${addressBufferList.length}`);
    for (const addressBuffer of addressBufferList) {
      const address = hexTransformer.from(addressBuffer);
      const addressTvl = await this.calculateAddressTvl(address, tokenPrices);
      if (addressTvl.gt(new BigNumber(0))) {
        this.logger.log(`Address ${address} tvl: ${addressTvl}`);
      }
      addressTvlMap.set(address, addressTvl);
    }
    return addressTvlMap;
  }

  async calculateAddressTvl(address: string, tokenPrices: Map<string, BigNumber>): Promise<BigNumber> {
    const addressBuffer: Buffer = hexTransformer.to(address);
    const addressBalances = await this.balanceRepository.getAccountBalances(addressBuffer);
    let tvl: BigNumber = new BigNumber(0);
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
      tvl = tvl.plus(tokenTvl);
    }
    // update user and referrer address tvl
    let addressTvl = await this.addressTvlRepository.getAddressTvl(address);
    if (!addressTvl) {
      addressTvl = this.addressTvlRepository.createDefaultAddressTvl(address);
    }
    addressTvl.tvl = tvl.toNumber();
    await this.addressTvlRepository.upsert(addressTvl, true, ["address"]);
    return tvl;
  }

  async updateGroupTvl(addressTvlMap: Map<string, BigNumber>): Promise<void> {
    const allGroupIds = await this.inviteRepository.getAllGroups();
    this.logger.log(`All group length: ${allGroupIds.length}`);
    for (const groupId of allGroupIds) {
      let tvl = new BigNumber(0);
      const members = await this.inviteRepository.getGroupMembers(groupId);
      for (const member of members) {
        const memberTvl = addressTvlMap.get(member);
        if (!!memberTvl) {
          tvl = tvl.plus(memberTvl);
        }
      }
      let groupTvl = await this.groupTvlRepository.getGroupTvl(groupId);
      if (!groupTvl) {
        groupTvl = this.groupTvlRepository.createDefaultGroupTvl(groupId);
      }
      groupTvl.tvl = tvl.toNumber();
      if (groupTvl.tvl > 0) {
        this.logger.log(`Group ${groupTvl.groupId} tvl: ${groupTvl.tvl}`);
        await this.groupTvlRepository.upsert(groupTvl, true, ["groupId"]);
      }
    }
  }

  async updateReferralTvl(addressTvlMap: Map<string, BigNumber>): Promise<void> {
    const addressList = addressTvlMap.keys();
    for (const address of addressList) {
      const referees = await this.referrerRepository.getReferees(address);
      if (referees.length > 0) {
        let refTvl = new BigNumber(0);
        referees.forEach((referee) => {
          const tvl = addressTvlMap.get(referee.address);
          if (!!tvl) {
            refTvl = refTvl.plus(tvl);
          }
        });
        if (refTvl.gt(new BigNumber(0))) {
          this.logger.log(`Address ${address} ref tvl: ${refTvl}`);
          let addressTvl = await this.addressTvlRepository.getAddressTvl(address);
          if (!addressTvl) {
            addressTvl = this.addressTvlRepository.createDefaultAddressTvl(address);
          }
          addressTvl.referralTvl = refTvl.toNumber();
          await this.addressTvlRepository.upsert(addressTvl, true, ["address"]);
        }
      }
    }
  }
}
