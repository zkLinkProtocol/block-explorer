import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Histogram } from "prom-client";
import { MoreThanOrEqual, LessThanOrEqual, Between, FindOptionsWhere } from "typeorm";
import { IDbTransaction, UnitOfWork } from "../unitOfWork";
import { BlockchainService } from "../blockchain/blockchain.service";
import { BlockWatcher } from "./block.watcher";
import { BlockData } from "../dataFetcher/types";
import { BalanceService } from "../balance/balance.service";
import { TokenService } from "../token/token.service";
import {
  BlockRepository,
  LogRepository,
  TransferRepository,
  BlockScanRangeRepository,
  PointsRepository, PointsHistoryRepository,ReferralsRepository
} from "../repositories";
import { Block,Referral } from "../entities";
import { TransactionProcessor } from "../transaction";
import { validateBlocksLinking } from "./block.utils";
import splitIntoChunks from "../utils/splitIntoChunks";
import {
  BLOCKS_BATCH_PROCESSING_DURATION_METRIC_NAME,
  BLOCK_PROCESSING_DURATION_METRIC_NAME,
  BlocksBatchProcessingMetricLabels,
  BlockProcessingMetricLabels,
} from "../metrics";
import { BLOCKS_REVERT_DETECTED_EVENT } from "../constants";
import { unixTimeToDateString } from "../utils/date";
import {BigNumber} from "ethers";
import {BlockScanRange} from "../entities/blockScanRange.entity";
import {InjectRepository} from "@nestjs/typeorm";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class BlockProcessor {
  private readonly logger: Logger;
  private readonly fromBlock: number;
  private readonly toBlock: number;
  private readonly disableBlocksRevert: boolean;
  private readonly numberOfBlocksPerDbTransaction: number;
  private readonly pointsStatisticalPeriodSecs: number;
  private timer?: NodeJS.Timeout;

  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly blockchainService: BlockchainService,
    private readonly transactionProcessor: TransactionProcessor,
    private readonly balanceService: BalanceService,
    private readonly tokenService: TokenService,
    private readonly blockWatcher: BlockWatcher,
    private readonly blockRepository: BlockRepository,
    private readonly logRepository: LogRepository,
    private readonly pointsRepository: PointsRepository,
    private readonly pointsHistoryRepository: PointsHistoryRepository,
    private readonly blockScanRangeRepository: BlockScanRangeRepository,
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
    this.pointsStatisticalPeriodSecs = configService.get<number>("blocks.pointsStatisticalPeriodSecs");
  }

  public async handlePointsPeriod(fromBlock: number,toBlock: number): Promise<boolean> {
      console.log(`handlePointsPeriod ${fromBlock} - ${toBlock}`);
      // clear timer
      if (this.timer) {
        clearTimeout(this.timer);
      }
      // get all addresses
      const addresses = await this.balanceService.getAllAddresses();
      if (!addresses.length) {
        return false;
      }

      // get all tokens
      const tokens = await this.tokenService.getAllTokens();
      if (!tokens.length) {
        return false;
      }

      for ( const address of addresses ) {
        // calc points for every account
        let balances = await this.balanceService.getAccountBalances(address);
        let totalAmount = BigNumber.from(0);
        //todo: add handler
        for ( const balance of balances ) {
           const tokenBalance: BigNumber = BigNumber.from(balance.balance);
           const token = tokens.find(token => token.l2Address === balance.tokenAddress);
           const tokenPrice: number = token == null ? 0 : token.usdPrice;
           const tokenAmount = tokenBalance.mul(tokenPrice);
           totalAmount.add(tokenAmount);
        }
        //todo: get multiplier and unitPoint from config or database
        const multiplier = 1;
        const unitPoint = 10;
        const stakePoint = totalAmount.mul(multiplier*unitPoint).toNumber();
        let addrStr = address.toString('hex');
        console.log(`account ${addrStr} point ${stakePoint} at ${fromBlock} - ${toBlock}`);

        const refPoint = 0;
        await this.pointsRepository.add(addrStr,stakePoint,refPoint);
        await this.pointsHistoryRepository.add(addrStr,toBlock,stakePoint,refPoint);
      }

    //calc referral point
    //todo: add cache
    let referrals = [];
    let offset = BigInt(Number.MAX_SAFE_INTEGER);
    while (true) {
      let ret = await this.referralRepository.getReferralsByBlock(toBlock,offset);
      if (ret.length == 0) {
        break;
      }
      referrals.push(...ret);
      offset = BigInt(ret[0].id);
    }
    console.log(referrals.length);
    let refPoints = new Map();
    for ( const referral of referrals) {
      const referAddr = referral.address;
      let p = refPoints.get(referAddr);
      let referPoint = p === undefined ? 0: p;
      const refereeStakePoint = await this.pointsRepository.getStakePointByAddress(referral.referee);
      const newReferPoint = referPoint + refereeStakePoint*0.1;
      refPoints.set(referAddr,newReferPoint);
    }

    // update referral points
    // todo: process in batch
    for (const [refer, point] of refPoints.entries()) {
      await this.pointsRepository.update(refer,point);
    }

    // save scan blocks
    await this.blockScanRangeRepository.add(fromBlock,toBlock);
    // set timer
    const timeOutFromBlock = toBlock;
    const timeOutToBlock =  timeOutFromBlock;
    const fun = this.handlePointsPeriod;
    this.timer = setTimeout(
        async function ()  {
          await fun(timeOutFromBlock, timeOutToBlock);
          console.log("timer triggered");
        }, this.pointsStatisticalPeriodSecs*1000,fun,timeOutFromBlock,timeOutToBlock,
    )

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
    let blockData = blocksToProcess[0];
    const { block, blockDetails } = blockData;
    //skip genesis block and 1st block
    if ( block.number > 1) {
      const blockTs = block.timestamp;
      // get previous handled block timestamp
      const preBlockRange = await this.blockScanRangeRepository.getLastScanToBlock();
      const preScanToBlockNumber = preBlockRange == null ? 1 : preBlockRange.to;
      console.log(`Last scan to block number ${preScanToBlockNumber}`);
      const preBlock = await this.blockRepository.getLastBlock({
        where: {number: preScanToBlockNumber}
      });
      const prePointsBlockTs = preBlock.timestamp.getTime() / 1000;
      const ts_interval = blockTs - prePointsBlockTs;
      console.log(`Current block ${block.number} ,timestamp interval ${ts_interval},config period ${this.pointsStatisticalPeriodSecs}`);
      if (ts_interval > this.pointsStatisticalPeriodSecs) {
        let periods = (blockTs - prePointsBlockTs) / this.pointsStatisticalPeriodSecs;
        console.log(`Ts interval periods ${periods}`);
        for (let i = 0; i < periods; i++) {
          let from_block = preBlockRange == null ? 1 : Math.min(preBlock.number + 1, block.number - 1);
          let to_block = block.number - 1;
          await this.handlePointsPeriod(from_block, to_block);
        }
      } else if (ts_interval == this.pointsStatisticalPeriodSecs) {
        let from_block = preBlockRange == null ? 1 : preBlock.number + 1;
        let to_block = block.number;
        await this.handlePointsPeriod(from_block, to_block);
      } else {
        console.log(`${preBlock.number} - ${block.number} block time interval does not reach the statistical period `);
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
