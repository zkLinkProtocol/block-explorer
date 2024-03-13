import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import { PointsRepository, BlockRepository, TransferRepository, BalanceRepository } from "../repositories";
import { TokenOffChainDataProvider } from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import { Token, TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { Block, BlockAddressPoint, Transfer } from "../entities";
import { BlockTokenPriceRepository } from "../repositories/blockTokenPrice.repository";
import { BlockAddressPointRepository } from "../repositories/blockAddressPoint.repository";
import { sleep } from "zksync-web3/build/src/utils";
import { hexTransformer } from "../transformers/hex.transformer";
import { ConfigService } from "@nestjs/config";

const STABLE_COIN_TYPE = "Stablecoin";
const ETHEREUM_CG_PRICE_ID = "ethereum";
const DEPOSIT_MULTIPLIER: BigNumber = new BigNumber(10);

type AddressTvl = {
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
    private readonly tokenOffChainDataProvider: TokenOffChainDataProvider,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(PointService.name);
    this.pointsPhase1StartTime = new Date(configService.get<string>("points.pointsPhase1StartTime"));
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
        const addressTvlMap = await this.getAddressTvl(currentRunBlockNumber, tokenPrices);
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
    const newDepositPoint = (await this.calculateDepositPoint(tokenAmount, tokenInfo, tokenPrices)).toNumber();
    const blockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, from);
    if (!blockAddressPoint) {
      // get the address point of exist max block number
      const currentAddressPoint = await this.blockAddressPointRepository.getLatestPoint(from);
      let totalStakePoint = Number(0);
      let totalRefPoint = Number(0);
      if (!!currentAddressPoint) {
        totalStakePoint = Number(currentAddressPoint.totalStakePoint);
        totalRefPoint = Number(currentAddressPoint.totalRefPoint);
      }
      const upsert = {
        blockNumber: blockNumber,
        address: from,
        depositPoint: newDepositPoint,
        tvl: Number(0),
        holdBasePoint: Number(0),
        holdPoint: Number(0),
        refPoint: Number(0),
        totalStakePoint: totalStakePoint + newDepositPoint,
        totalRefPoint: totalRefPoint,
      };
      await this.blockAddressPointRepository.upsertBlockAddressPoint(upsert, transferId);
    } else {
      const upsert = {
        blockNumber: blockNumber,
        address: from,
        depositPoint: Number(blockAddressPoint.depositPoint) + newDepositPoint,
        tvl: blockAddressPoint.tvl,
        holdBasePoint: blockAddressPoint.holdBasePoint,
        holdPoint: blockAddressPoint.holdPoint,
        refPoint: blockAddressPoint.refPoint,
        totalStakePoint: Number(blockAddressPoint.totalStakePoint) + newDepositPoint,
        totalRefPoint: blockAddressPoint.totalRefPoint,
      };
      await this.blockAddressPointRepository.upsertBlockAddressPoint(upsert, transferId);
    }
  }

  async calculateDepositPoint(
    tokenAmount: BigNumber,
    token: Token,
    tokenPrices: Map<string, BigNumber>
  ): Promise<BigNumber> {
    // NOVA Points = 10 * Token multiplier * Deposit Amount * Token Price / ETH price
    // The price of Stablecoin is 1 usd
    const price = this.getTokenPrice(token, tokenPrices);
    const ethPrice = this.getETHPrice(tokenPrices);
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

  async getAddressTvl(blockNumber: number, tokenPrices: Map<string, BigNumber>): Promise<Map<string, AddressTvl>> {
    const addressTvlMap: Map<string, AddressTvl> = new Map();
    const addressBufferList = await this.balanceRepository.getAllAddressesByBlock(blockNumber);
    this.logger.log(`The address list length: ${addressBufferList.length}`);
    for (const addressBuffer of addressBufferList) {
      const address = hexTransformer.from(addressBuffer);
      this.logger.log(`Get address tvl: ${address}`);
      const blockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, address);
      let addressTvl: AddressTvl;
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
  ): Promise<AddressTvl> {
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
    const blockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, address);
    if (!blockAddressPoint) {
      // get the address point of exist max block number
      const currentAddressPoint = await this.blockAddressPointRepository.getLatestPoint(address);
      let totalStakePoint = Number(0);
      let totalRefPoint = Number(0);
      if (!!currentAddressPoint) {
        totalStakePoint = Number(currentAddressPoint.totalStakePoint);
        totalRefPoint = Number(currentAddressPoint.totalRefPoint);
      }
      const upsert = {
        blockNumber: blockNumber,
        address: address,
        depositPoint: Number(0),
        tvl: tvl.toNumber(),
        holdBasePoint: holdBasePoint.toNumber(),
        holdPoint: Number(0),
        refPoint: Number(0),
        totalStakePoint: totalStakePoint,
        totalRefPoint: totalRefPoint,
      };
      await this.blockAddressPointRepository.upsertBlockAddressPoint(upsert);
    } else {
      const upsert = {
        blockNumber: blockNumber,
        address: address,
        depositPoint: blockAddressPoint.depositPoint,
        tvl: tvl.toNumber(),
        holdBasePoint: holdBasePoint.toNumber(),
        holdPoint: blockAddressPoint.holdPoint,
        refPoint: blockAddressPoint.refPoint,
        totalStakePoint: blockAddressPoint.totalStakePoint,
        totalRefPoint: blockAddressPoint.totalRefPoint,
      };
      await this.blockAddressPointRepository.upsertBlockAddressPoint(upsert);
    }
    return {
      tvl,
      holdBasePoint,
    };
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
}
