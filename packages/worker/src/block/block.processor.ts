import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Histogram } from "prom-client";
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { IDbTransaction, UnitOfWork } from "../unitOfWork";
import { BlockchainService } from "../blockchain/blockchain.service";
import { BlockWatcher } from "./block.watcher";
import { BlockData } from "../dataFetcher/types";
import { BalanceService } from "../balance/balance.service";
import { TokenL1Address, TokenService } from "../token/token.service";
import {
  BlockRepository,
  LogRepository,
  PointsHistoryRepository,
  PointsRepository,
  ReferralsRepository,
  TransferRepository,
} from "../repositories";
import { Block, Token as TokenEntity, TransferType } from "../entities";
import { TransactionProcessor } from "../transaction";
import { validateBlocksLinking } from "./block.utils";
import splitIntoChunks from "../utils/splitIntoChunks";
import {
  BLOCK_PROCESSING_DURATION_METRIC_NAME,
  BlockProcessingMetricLabels,
  BLOCKS_BATCH_PROCESSING_DURATION_METRIC_NAME,
  BlocksBatchProcessingMetricLabels,
} from "../metrics";
import { BLOCKS_REVERT_DETECTED_EVENT } from "../constants";
import { unixTimeToDateString } from "../utils/date";
import { TokenOffChainDataProvider } from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import { utils } from "zksync-web3";
import tokens from "../../tokens";
import BigNumber from "bignumber.js";
@Injectable()
export class BlockProcessor {
  private readonly logger: Logger;
  private readonly fromBlock: number;
  private readonly toBlock: number;
  private readonly disableBlocksRevert: boolean;
  private readonly numberOfBlocksPerDbTransaction: number;
  private readonly pointsStatisticalPeriodSecs: number;
  private readonly pointsPhase1StartTime: string;
  private readonly pointsPhase1EndTime: string;
  private readonly pointsEarlyDepositEndTime: string;
  // restart will handle from genesis block
  private lastHandlePointBlock: number;
  private addressEligibleCache: Map<string, boolean>;
  private supportTokens = [];

  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly blockchainService: BlockchainService,
    private readonly transactionProcessor: TransactionProcessor,
    private readonly balanceService: BalanceService,
    private readonly tokenService: TokenService,
    private readonly tokenOffChainDataProvider: TokenOffChainDataProvider,
    private readonly blockWatcher: BlockWatcher,
    private readonly blockRepository: BlockRepository,
    private readonly logRepository: LogRepository,
    private readonly pointsRepository: PointsRepository,
    private readonly pointsHistoryRepository: PointsHistoryRepository,
    private readonly transferRepository: TransferRepository,
    private readonly referralRepository: ReferralsRepository,
    private readonly eventEmitter: EventEmitter2,
    @InjectMetric(BLOCKS_BATCH_PROCESSING_DURATION_METRIC_NAME)
    private readonly blocksBatchProcessingDurationMetric: Histogram<BlocksBatchProcessingMetricLabels>,
    @InjectMetric(BLOCK_PROCESSING_DURATION_METRIC_NAME)
    private readonly processingDurationMetric: Histogram<BlockProcessingMetricLabels>,
    configService: ConfigService
  ) {
    this.logger = new Logger(BlockProcessor.name);
    this.fromBlock = configService.get<number>("blocks.fromBlock");
    this.toBlock = configService.get<number>("blocks.toBlock");
    this.disableBlocksRevert = configService.get<boolean>("blocks.disableBlocksRevert");
    this.numberOfBlocksPerDbTransaction = configService.get<number>("blocks.numberOfBlocksPerDbTransaction");
    this.pointsStatisticalPeriodSecs = configService.get<number>("points.pointsStatisticalPeriodSecs");
    this.pointsPhase1StartTime = configService.get<string>("points.pointsPhase1StartTime");
    this.pointsPhase1EndTime = configService.get<string>("points.pointsPhase1EndTime");
    this.pointsEarlyDepositEndTime = configService.get<string>("points.pointsPhase1EndTime");
    this.lastHandlePointBlock = -1;
    this.addressEligibleCache = new Map();
    tokens.forEach((token) => {
      this.supportTokens.push(token);
    });
  }

  public checkTokenIsEth(tokenAddress: string): boolean {
    //todo: WETH or other ?
    return utils.isETH(tokenAddress);
  }

  public getEarlyBirdMultiplier(blockTs: Date): number {
    // 1st week: 2,second week:1.5,third,forth week:1.2,
    const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
    const startDate = new Date(this.pointsPhase1StartTime);
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

  public async getTokenPrice(priceId: string, ts: number): Promise<number> {
    const price = await this.tokenOffChainDataProvider.getTokenPriceByBlock(priceId, ts);
    if (!price) {
      throw new Error(`${priceId} price can't get at ${ts}`);
    }
    return price;
  }

  public async handlePointsPeriod(fromBlockNumber: number, toBlockNumber: number): Promise<boolean> {
    const toBlock = await this.blockRepository.getLastBlock({
      where: { number: toBlockNumber },
    });
    console.log(`handlePointsPeriod ${fromBlockNumber} - ${toBlockNumber}`);
    this.lastHandlePointBlock = toBlock.number;
    // clear timer
    // if (this.timer) {
    //   clearTimeout(this.timer);
    // }
    // get all addresses
    //todo:batch
    const addresses = await this.referralRepository.getAllAddressesInOrder(toBlockNumber);
    if (!addresses.length) {
      return false;
    }

    // get all support tokens
    const tokens = this.tokenService.getAllSupportTokens();

    const tokenPrices = new Map();
    for (const token of tokens) {
      const tokenPrice = await this.getTokenPrice(token.cgPriceId, toBlock.timestamp.getTime());
      tokenPrices.set(token.symbol, tokenPrice);
    }

    const stakePointsCache = new Map();
    const phase1EndDate = new Date(this.pointsPhase1EndTime);
    const earlyBirdMultiplier = this.getEarlyBirdMultiplier(toBlock.timestamp);
    const ethPrice = await this.getTokenPrice("ethereum", toBlock.timestamp.getTime());
    for (const address of addresses) {
      let stakePoint = 0;
      let refPoint = 0;
      const addrStr = `0x${address.toString("hex")}`;
      const eligible = this.addressEligibleCache.get(addrStr);
      if (eligible) {
        let addressAmount = new BigNumber(0);
        // calc group TVL
        let members = await this.referralRepository.getGroupMembersByAddress(address, toBlockNumber);
        // should not empty,use for test
        if (!members.length) {
          members = [address];
        }
        let groupTvl = new BigNumber(0);
        for (const member of members) {
          let memberAmount = new BigNumber(0);
          const balances = await this.balanceService.getAccountBalances(member);
          for (const balance of balances) {
            const token = tokens.find((token) => {
              const tokenAddress = `0x${Buffer.from(balance.tokenAddress).toString("hex")}`;
              return token.address.find((t) => t.l2Address.toLowerCase() == tokenAddress);
            });
            if (!token) {
              continue;
            }
            const tokenPrice = tokenPrices.get(token.symbol);
            const decimals = Math.pow(10, Number(token.decimals));
            const tokenBalance = new BigNumber(balance.balance).dividedBy(decimals);
            console.log(
              `${member.toString("hex")} balance of ${token.symbol} is ${tokenBalance},price is ${tokenPrice}`
            );
            const tokenAmount = tokenBalance.multipliedBy(tokenPrice);
            if (member.equals(address)) {
              addressAmount = addressAmount.plus(tokenAmount.multipliedBy(token.multiplier));
            }
            memberAmount = memberAmount.plus(tokenAmount);
          }
          groupTvl = groupTvl.plus(memberAmount);
        }
        groupTvl = groupTvl.dividedBy(ethPrice);
        // calc points for every account
        const groupBooster = this.getGroupBooster(groupTvl.toNumber());
        //todo: growthBooster low priority
        const growthBooster = 0;
        const oldPoint = await this.pointsRepository.getPointByAddress(address);
        //(1 + Group Booster + Growth Booster) * sum_all tokens in activity list
        // (Early_Bird_Multiplier * Token Multiplier * Token Amount * Token Price/ ETH_Price )
        let newStakePoint =
          ((1 + groupBooster + growthBooster) * addressAmount.toNumber() * earlyBirdMultiplier) / ethPrice;
        newStakePoint = Number(newStakePoint.toFixed(2));
        const oldStakePoint = Number(oldPoint?.stakePoint || 0);
        stakePoint = oldStakePoint + newStakePoint;
        stakePointsCache.set(addrStr, stakePoint);

        //calc referral point
        const referees = await this.referralRepository.getReferralsByAddress(address, toBlockNumber);
        for (const referee of referees) {
          const refereeStr = `0x${referee.toString("hex")}`;
          let refereeStakePoint = stakePointsCache.get(refereeStr);
          if (!refereeStakePoint) {
            refereeStakePoint = await this.pointsRepository.getStakePointByAddress(referee);
          }
          console.log(`${addrStr} invite ${refereeStr} point is ${refereeStakePoint}`);
          refPoint += refereeStakePoint * 0.1;
        }

        const oldRefPoint = Number(oldPoint?.refPoint || 0);
        refPoint = oldRefPoint + Number(refPoint.toFixed(2));
        console.log(`account ${addrStr} point ${stakePoint} ${refPoint} at ${fromBlockNumber} - ${toBlockNumber}`);
      }
      const refNumber = 0;
      await this.pointsRepository.add(address, stakePoint, refPoint, refNumber);
      await this.pointsHistoryRepository.add(addrStr, toBlockNumber, stakePoint, refPoint, refNumber);
    }

    // set timer
    // const timeOutFromBlock = toBlockNumber;
    // const timeOutToBlock =  timeOutFromBlock;
    // const fun = this.handlePointsPeriod;
    // this.timer = setTimeout(
    //     async function ()  {
    //       await fun(timeOutFromBlock, timeOutToBlock);
    //       console.log("timer triggered");
    //     }, this.pointsStatisticalPeriodSecs*1000,fun,timeOutFromBlock,timeOutToBlock,
    // )

    return true;
  }

  public async processNextBlocksRange(): Promise<boolean> {
    const lastDbBlock = await this.blockRepository.getLastBlock({
      where: this.buildBlockRangeCondition(),
      select: { number: true, hash: true },
    });
    const lastDbBlockNumber = lastDbBlock?.number;
    this.logger.debug(`Last block number stored in DB: ${lastDbBlockNumber}`);

    const blocksToProcess = await this.blockWatcher.getNextBlocksToProcess(lastDbBlockNumber);
    if (!blocksToProcess.length) {
      this.logger.debug("No more blocks to process, waiting for new blocks");
      if (!lastDbBlock) {
        return false;
      }
      const lastBlockFromBlockchain = await this.blockchainService.getBlock(lastDbBlockNumber);
      if (lastDbBlock.hash === lastBlockFromBlockchain?.hash) {
        return false;
      }
      this.triggerBlocksRevertEvent(lastDbBlockNumber);
      return false;
    }

    if (lastDbBlock && lastDbBlock.hash !== blocksToProcess[0].block?.parentHash) {
      this.triggerBlocksRevertEvent(lastDbBlockNumber);
      return false;
    }

    const allBlocksExist = !blocksToProcess.find((blockInfo) => !blockInfo.block || !blockInfo.blockDetails);
    if (!allBlocksExist) {
      // We don't need to handle this potential revert as these blocks are not in DB yet,
      // try again later once these blocks are present in blockchain again.
      this.logger.warn(
        "Not all the requested blocks from the next blocks to process range exist in blockchain, likely revert has happened",
        {
          lastDbBlockNumber,
        }
      );
      return false;
    }
    const isBlocksLinkingValid = validateBlocksLinking(blocksToProcess);
    if (!isBlocksLinkingValid) {
      // We don't need to handle this revert as these blocks are not in DB yet,
      // we just need to wait for blockchain to complete this revert before inserting these blocks.
      // This is very unlikely to ever happen.
      this.logger.warn(
        "Some of the requested blocks from the next blocks to process range have invalid link to previous block, likely revert has happened",
        {
          lastDbBlockNumber: lastDbBlockNumber,
        }
      );
      return false;
    }

    //points handler
    if (this.lastHandlePointBlock == -1) {
      this.lastHandlePointBlock = await this.pointsHistoryRepository.getLastHandlePointBlock();
      const eligibleAddresses = await this.referralRepository.getAddressEligible();
      console.log(eligibleAddresses);
      for (const addr of eligibleAddresses) {
        this.addressEligibleCache.set(addr.toString("hex"), true);
      }
    }
    const blockData = blocksToProcess[0];
    const { block, blockDetails } = blockData;
    //skip genesis block and 1st block
    if (block.number > 1) {
      const blockTs = block.timestamp;
      const pointsPhase1StartTime = new Date(this.pointsPhase1StartTime).getTime() / 1000;
      console.log(`check ${blockTs} ${pointsPhase1StartTime}`);
      if (blockTs < pointsPhase1StartTime) {
        //todo: save db
        this.lastHandlePointBlock = block.number;
      } else {
        // get previous handled block timestamp
        const preScanToBlockNumber = this.lastHandlePointBlock;
        console.log(`Last scan to block number ${preScanToBlockNumber}`);
        const preBlock = await this.blockRepository.getLastBlock({
          where: { number: preScanToBlockNumber },
        });
        const prePointsBlockTs = preBlock.timestamp.getTime() / 1000;
        const ts_interval = blockTs - prePointsBlockTs;
        console.log(
          `Current block ${block.number} ,timestamp interval ${ts_interval},config period ${this.pointsStatisticalPeriodSecs}`
        );
        if (ts_interval > this.pointsStatisticalPeriodSecs) {
          const periods = (ts_interval / this.pointsStatisticalPeriodSecs) | 0;
          console.log(`Ts interval periods ${periods}`);
          const fromBlockNumber = Math.min(preBlock.number + 1, block.number - 1);
          const toBlockNumber = block.number - 1;
          for (let i = 0; i < periods; i++) {
            await this.handlePointsPeriod(fromBlockNumber, toBlockNumber);
          }
        } else {
          console.log(
            `${preBlock.number} - ${block.number} block time interval does not reach the statistical period `
          );
        }
      }
    }

    const stopDurationMeasuring = this.blocksBatchProcessingDurationMetric.startTimer();
    let dbTransactions: IDbTransaction[] = [];

    try {
      const blocksToProcessChunks = splitIntoChunks(blocksToProcess, this.numberOfBlocksPerDbTransaction);

      dbTransactions = blocksToProcessChunks.map((blocksToProcessChunk) =>
        this.unitOfWork.useTransaction(async () => {
          await Promise.all(blocksToProcessChunk.map((blockInfo) => this.addBlock(blockInfo)));
        }, true)
      );
      await Promise.all(dbTransactions.map((t) => t.waitForExecution()));

      // sequentially commit transactions to preserve blocks order in DB
      for (const dbTransaction of dbTransactions) {
        await dbTransaction.commit();
      }

      stopDurationMeasuring({ status: "success" });
    } catch (error) {
      await Promise.all(dbTransactions.map((dbTransaction) => dbTransaction.ensureRollbackIfNotCommitted()));
      stopDurationMeasuring({ status: "error" });
      throw error;
    }

    return true;
  }

  private triggerBlocksRevertEvent(detectedIncorrectBlockNumber: number) {
    this.logger.warn("Blocks revert detected", { detectedIncorrectBlockNumber });
    if (!this.disableBlocksRevert) {
      this.eventEmitter.emit(BLOCKS_REVERT_DETECTED_EVENT, {
        detectedIncorrectBlockNumber,
      });
    }
  }

  private async addBlock(blockData: BlockData): Promise<void> {
    let blockProcessingStatus = "success";

    const { block, blockDetails } = blockData;
    const blockNumber = block.number;
    this.logger.log({ message: `Adding block #${blockNumber}`, blockNumber });

    const stopDurationMeasuring = this.processingDurationMetric.startTimer();
    try {
      await this.blockRepository.add(block, blockDetails);

      await Promise.all(
        blockData.transactions.map((transaction) => this.transactionProcessor.add(blockNumber, transaction))
      );

      if (blockData.blockLogs.length) {
        this.logger.debug({
          message: "Saving block logs to the DB",
          blockNumber: blockNumber,
        });
        await this.logRepository.addMany(
          blockData.blockLogs.map((log) => ({
            ...log,
            timestamp: unixTimeToDateString(blockDetails.timestamp),
          }))
        );
      }

      if (blockData.blockTransfers.length) {
        this.logger.debug({
          message: "Saving block transfers to the DB",
          blockNumber: blockNumber,
        });
        await this.transferRepository.addMany(blockData.blockTransfers);
      }

      if (blockData.changedBalances.length) {
        this.logger.debug({ message: "Updating balances and tokens", blockNumber });
        const erc20TokensForChangedBalances = this.balanceService.getERC20TokensForChangedBalances(
          blockData.changedBalances
        );

        await Promise.all([
          this.balanceService.saveChangedBalances(blockData.changedBalances),
          this.tokenService.saveERC20Tokens(erc20TokensForChangedBalances),
        ]);
      }

      // calc deposit points
      for (const transaction of blockData.transactions) {
        const deposits = transaction.transfers.filter((t) => t.type == TransferType.Deposit);
        if (!deposits.length) {
          continue;
        }
        console.log(`addBlock at ${block.number} deposits number is ${deposits.length}`);
        type TokenInfo = { multiplier: number; price: number; decimals: number };
        const tokenInfos = new Map();
        let ethPrice = 0;
        const depositPoints = new Map();
        const accountActives = [];
        for (const deposit of deposits) {
          // update referrals blockNumber
          const addrBuf = Buffer.from(deposit.from.startsWith("0x") ? deposit.from.substring(2) : deposit.from, "hex");
          // fixme: 反复更新了地址的首次充值区块高度
          await this.referralRepository.updateReferralsBlock(addrBuf, block.number);
          let depositPoint = 0;
          let depositEthAmount = new BigNumber(0);
          if (this.checkTokenIsEth(deposit.tokenAddress)) {
            // depositEthAmount = Number(deposit.amount) / Math.pow(10,18);
            depositEthAmount = new BigNumber(deposit.amount).dividedBy(new BigNumber(10).pow(18));
            const tokenMultiplier = this.tokenService.getTokenMultiplier("ETH");
            depositPoint = depositEthAmount.multipliedBy(10).multipliedBy(tokenMultiplier).toNumber();
          } else {
            //not support tokens
            if (!this.tokenService.isSupportToken(deposit.tokenAddress)) {
              continue;
            }
            if (ethPrice == 0) {
              ethPrice = await this.tokenOffChainDataProvider.getTokenPriceByBlock("ethereum", block.timestamp * 1000);
            }
            let tokenInfo: TokenInfo = tokenInfos.get(deposit.tokenAddress);
            if (!tokenInfo) {
              const token = this.tokenService.getSupportToken(deposit.tokenAddress);
              console.log(`addBlock deposit token is ${token.symbol}`);
              const tokenMultiplier = this.tokenService.getTokenMultiplier(token.symbol);
              const tokenPrice = await this.tokenOffChainDataProvider.getTokenPriceByBlock(
                token.cgPriceId,
                block.timestamp * 1000
              );
              tokenInfo = {
                multiplier: tokenMultiplier,
                price: tokenPrice,
                decimals: token.decimals,
              };
              tokenInfos.set(deposit.tokenAddress, tokenInfo);
            }

            const decimals = Math.pow(10, tokenInfo.decimals);
            const depositAmount = new BigNumber(deposit.amount).dividedBy(decimals);
            depositEthAmount = depositAmount.multipliedBy(tokenInfo.price).dividedBy(ethPrice);
            depositPoint = depositEthAmount.multipliedBy(10).multipliedBy(tokenInfo.multiplier).toNumber();
          }
          // check point eligible
          // fixme: 通过referralRepository来查询地址的激活状态，否则同一个区块中，同一个地址的多个充值无法拦截住
          const eligible = this.addressEligibleCache.get(deposit.from);
          let newEligible = eligible;
          if (!eligible) {
            const earlyDepositEndTime = new Date(this.pointsEarlyDepositEndTime);
            const phase1EndTime = new Date(this.pointsPhase1EndTime);
            const depositTime = new Date(deposit.timestamp);
            console.log(`addBlock check eligible ${depositEthAmount} ${depositTime}`);
            newEligible =
              (depositEthAmount.gte(0.09) && depositTime <= earlyDepositEndTime) ||
              (depositEthAmount.gte(0.225) && depositTime > earlyDepositEndTime && depositTime < phase1EndTime);
          }
          if (!newEligible) {
            continue;
          }
          if (newEligible != eligible) {
            this.addressEligibleCache.set(deposit.from, newEligible);
            accountActives.push(addrBuf);
          }
          const oldPoint = depositPoints.get(deposit.from);
          let newPoint = oldPoint || 0;
          newPoint += depositPoint;
          depositPoints.set(deposit.from, newPoint);
        }

        // save to db
        await this.pointsRepository.updateDeposits(depositPoints);
        await this.referralRepository.updateActives(accountActives);
      }
    } catch (error) {
      blockProcessingStatus = "error";
      throw error;
    } finally {
      stopDurationMeasuring({ status: blockProcessingStatus, action: "add" });
    }
  }

  private buildBlockRangeCondition = (): FindOptionsWhere<Block> => {
    return this.fromBlock && this.toBlock
      ? {
          number: Between(this.fromBlock, this.toBlock),
        }
      : {
          ...(this.fromBlock && { number: MoreThanOrEqual(this.fromBlock) }),
          ...(this.toBlock && { number: LessThanOrEqual(this.toBlock) }),
        };
  };
}
