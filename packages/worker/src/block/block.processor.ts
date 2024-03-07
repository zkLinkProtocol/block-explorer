import {Injectable, Logger} from "@nestjs/common";
import {EventEmitter2} from "@nestjs/event-emitter";
import {ConfigService} from "@nestjs/config";
import {InjectMetric} from "@willsoto/nestjs-prometheus";
import {Histogram} from "prom-client";
import {Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual} from "typeorm";
import {IDbTransaction, UnitOfWork} from "../unitOfWork";
import {BlockchainService} from "../blockchain/blockchain.service";
import {BlockWatcher} from "./block.watcher";
import {BlockData} from "../dataFetcher/types";
import {BalanceService} from "../balance/balance.service";
import {TokenService} from "../token/token.service";
import {
  BlockRepository,
  LogRepository,
  PointsHistoryRepository,
  PointsRepository,
  ReferralsRepository,
  TransferRepository
} from "../repositories";
import {Block, Token as TokenEntity, TransferType} from "../entities";
import {TransactionProcessor} from "../transaction";
import {validateBlocksLinking} from "./block.utils";
import splitIntoChunks from "../utils/splitIntoChunks";
import {
  BLOCK_PROCESSING_DURATION_METRIC_NAME,
  BlockProcessingMetricLabels,
  BLOCKS_BATCH_PROCESSING_DURATION_METRIC_NAME,
  BlocksBatchProcessingMetricLabels,
} from "../metrics";
import {BLOCKS_REVERT_DETECTED_EVENT} from "../constants";
import {unixTimeToDateString} from "../utils/date";
import {TokenOffChainDataProvider} from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import { utils } from "zksync-web3";


@Injectable()
export class BlockProcessor {
  private readonly logger: Logger;
  private readonly fromBlock: number;
  private readonly toBlock: number;
  private readonly disableBlocksRevert: boolean;
  private readonly numberOfBlocksPerDbTransaction: number;
  private readonly pointsStatisticalPeriodSecs: number;
  private readonly pointsPhase1EndTime: string;
  private readonly pointsEarlyDepositEndTime: string;
  private timer?: NodeJS.Timeout;
  // restart will handle from genesis block
  private lastHandlePointBlock: number;
  private addressEligibleCache: Map<string,boolean>

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
    configService: ConfigService,
  ) {
    this.logger = new Logger(BlockProcessor.name);
    this.fromBlock = configService.get<number>("blocks.fromBlock");
    this.toBlock = configService.get<number>("blocks.toBlock");
    this.disableBlocksRevert = configService.get<boolean>("blocks.disableBlocksRevert");
    this.numberOfBlocksPerDbTransaction = configService.get<number>("blocks.numberOfBlocksPerDbTransaction");
    this.pointsStatisticalPeriodSecs = configService.get<number>("points.pointsStatisticalPeriodSecs");
    this.pointsPhase1EndTime = configService.get<string>("points.pointsPhase1EndTime");
    this.pointsEarlyDepositEndTime = configService.get<string>("points.pointsPhase1EndTime");
    this.lastHandlePointBlock = 0;
    this.addressEligibleCache = new Map();
  }

  public checkTokenIsEth(tokenAddress: string): boolean {
    //todo: WETH or other ?
    return utils.isETH(tokenAddress);
  }

  //public getEarlyBirdMultiplier(ts: Date): number {
  // }

  public getGroupBooster(groupTvl:number):number {
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

  // todo: maybe use config file or database
  public getTokenMultiplier(tokenSymbol: string): number {
    switch (tokenSymbol) {
      case 'ETH1':
      case 'WETH':
      case 'wBTC':
      case 'USDT':
      case 'USDC':
      case 'Dai':
      case 'FDUSD':
      case 'Frax':
      case 'USDe':
        return 2;
      case 'ARB':
      case 'MANTA':
      case 'MNT':
      case 'sDai':
      case 'wUSDM':
      case 'wstETH':
      case 'rETH':
      case 'wBETH':
      case 'mETH':
      case 'sfrxETH':
      case 'Stone':
      case 'swETH':
      case 'cbETH':
      case 'nETH':
        return 1.5;
      default:
        return 1;
    }
  }

  public async handlePointsPeriod(fromBlockNumber: number,toBlockNumber: number): Promise<boolean> {
    const toBlock = await this.blockRepository.getLastBlock({
      where: {number: toBlockNumber}
    });
      console.log(`handlePointsPeriod ${fromBlockNumber} - ${toBlockNumber}`);
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

      let tokenPrices = new Map();
      for ( const token of tokens ) {
        let priceId = this.tokenService.getCgIdByTokenSymbol(token.symbol);
        const tokenPrice = await this.tokenOffChainDataProvider.getTokenPriceByBlock(priceId, toBlock.timestamp.getTime());
        tokenPrices.set(token.l2Address,tokenPrice);
      }

      let stakePointsCache = new Map();
      let phase1EndDate = new Date(this.pointsPhase1EndTime);
      const earlyBirdMultiplier = toBlock.timestamp > phase1EndDate ? 1: 2;
      const ethPrice = await this.tokenOffChainDataProvider.getTokenPriceByBlock("ethereum", toBlock.timestamp.getTime());
      for ( const address of addresses ) {
        let eligible = this.addressEligibleCache.get(address.toString("hex"));
        // not have eligible to get point
        if (!eligible) {
          continue;
        }

        let addressAmount = 0;
        // calc group TVL
        let members = await this.referralRepository.getGroupMembersByAddress(address,toBlockNumber);
        // should not empty,use for test
        if (!members.length) {
          members = [address];
        }
        let groupTvl = 0;
        for (const member of members) {
          let memberAmount = 0;
          for ( const token of tokens ) {
            let tokenPrice = tokenPrices.get(token.l2Address);
            let tokenMultiplier = this.getTokenMultiplier(token.symbol);
            let balances = await this.balanceService.getAccountBalances(member);
            let balancesOfToken = balances.filter( balance => {
              let tokenAddress = `0x${Buffer.from(balance.tokenAddress).toString("hex")}`;
              return tokenAddress == token.l2Address;
            });
            for ( const balance of balancesOfToken ) {
              const decimals = Math.pow(10,Number(token.decimals));
              const tokenBalance = Number(balance.balance)/decimals;
              console.log(`${member.toString("hex")} balance of ${token.symbol} is ${tokenBalance},price is ${tokenPrice}`);
              const tokenAmount = tokenBalance*tokenPrice;
              if (member == address) {
                addressAmount += tokenAmount*tokenMultiplier;
              }
              memberAmount += tokenAmount;
            }
          }
          groupTvl += memberAmount;
        }
        groupTvl = groupTvl/ethPrice;
        // calc points for every account
        let groupBooster = this.getGroupBooster(groupTvl);
        //todo: growthBooster low priority
        let growthBooster = 0;
        //(1 + Group Booster + Growth Booster) * sum_all tokens in activity list
        // (Early_Bird_Multiplier * Token Multiplier * Token Amount * Token Price/ ETH_Price )
        let stakePoint = (1 + groupBooster + growthBooster)*addressAmount*earlyBirdMultiplier;
        stakePoint = Number(stakePoint.toFixed(2));
        stakePointsCache.set(address,stakePoint);
        let addrStr = address.toString('hex');
        console.log(`account ${addrStr} point ${stakePoint} at ${fromBlockNumber} - ${toBlockNumber}`);

        //calc referral point
        let refPoint = 0;
        let referees = await this.referralRepository.getReferralsByAddress(address,toBlockNumber);
        console.log(referees.length);
        for ( const referee of referees ) {
          console.log(referee);
          // group leader
          if (referee == address) {
            continue;
          }
          let refereeStakePoint = stakePointsCache.get(referee);
          if (!refereeStakePoint) {
            refereeStakePoint = await this.pointsRepository.getStakePointByAddress(referee);
          }
          refPoint += refereeStakePoint*0.1;
        }

        refPoint = Number(refPoint.toFixed(2));
        const refNumber = 0;
        await this.pointsRepository.add(addrStr,stakePoint,refPoint,refNumber);
        await this.pointsHistoryRepository.add(addrStr,toBlockNumber,stakePoint,refPoint,refNumber);
      }

    //calc referral point
    //let referrals = [];
    // let offset = BigInt(Number.MAX_SAFE_INTEGER);
    // while (true) {
    //   let ret = await this.referralRepository.getReferralsByBlock(toBlockNumber,offset);
    //   if (ret.length == 0) {
    //     break;
    //   }
    //   referrals.push(...ret);
    //   offset = BigInt(ret[0].id);
    // }
    // console.log(referrals.length);
    // let refPoints = new Map();
    // for ( const referral of referrals ) {
    //   console.log(referral.referee);
    //   const referAddr = referral.address;
    //   let p = refPoints.get(referAddr);
    //   let referPoint = p === undefined ? 0: p;
    //   const refereeStakePoint = await this.pointsRepository.getStakePointByAddress(referral.referee);
    //   const newReferPoint = referPoint + refereeStakePoint*0.1;
    //   refPoints.set(referAddr,newReferPoint);
    // }

    this.lastHandlePointBlock = toBlock.number;
    // set timer
    const timeOutFromBlock = toBlockNumber;
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
      const preScanToBlockNumber = this.lastHandlePointBlock == 0 ? 1 : this.lastHandlePointBlock;
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
        let fromBlockNumber = this.lastHandlePointBlock == 0 ? 1 : Math.min(preBlock.number + 1, block.number - 1);
        let toBlockNumber = block.number - 1;
        for (let i = 0; i < periods; i++) {
          await this.handlePointsPeriod(fromBlockNumber, toBlockNumber);
        }
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

      // calc deposit points
      for (const transaction of blockData.transactions) {
        let deposits = transaction.transfers.filter(t => t.type == TransferType.Deposit);
        if (!deposits.length) { continue };
        console.log(`addBlock at ${block.number} deposits number is ${deposits.length}`);
        let allTokens = await this.tokenService.getAllTokens()
        type TokenInfo = { multiplier: number, price: number, decimals: number };
        let tokenInfos = new Map();
        let ethPrice = 0;
        let depositPoints = new Map();
        for (const deposit of deposits) {
          // update referrals blockNumber
          await this.referralRepository.updateReferralsBlock(deposit.from,block.number);
          let depositPoint = 0;
          let depositEthAmount = 0;
          if (this.checkTokenIsEth(deposit.tokenAddress)) {
            depositEthAmount = Number(deposit.amount) / Math.pow(10,18);
            const tokenMultiplier = this.getTokenMultiplier("ETH");
            depositPoint = 10 * tokenMultiplier * depositEthAmount;
          } else {
            if (ethPrice == 0) {
              ethPrice = await this.tokenOffChainDataProvider.getTokenPriceByBlock("ethereum", block.timestamp * 1000);
            }
            let tokenInfo: TokenInfo = tokenInfos.get(deposit.tokenAddress);
            if (!tokenInfo) {
              let token = allTokens.find(t => t.l2Address == deposit.tokenAddress);
              console.log(`addBlock deposit token is ${token}`);
              let tokenMultiplier = this.getTokenMultiplier(token.symbol);
              let priceId = this.tokenService.getCgIdByTokenSymbol(token.symbol);
              let tokenPrice = await this.tokenOffChainDataProvider.getTokenPriceByBlock(priceId, block.timestamp * 1000);
              tokenInfo = {
                multiplier: tokenMultiplier,
                price: tokenPrice,
                decimals: token.decimals
              }
              tokenInfos.set(deposit.tokenAddress, tokenInfo);
            }

            let decimals = Math.pow(10, tokenInfo.decimals);
            let depositAmount = Number(deposit.amount) / decimals;
            depositEthAmount = depositAmount * tokenInfo.price / ethPrice;
            depositPoint = 10 * tokenInfo.multiplier * depositEthAmount;
          }
          // check point eligible
          let eligible = this.addressEligibleCache.get(deposit.from);
          let newEligible = eligible;
          if (!eligible) {
            const earlyDepositEndTime = new Date(this.pointsEarlyDepositEndTime);
            const phase1EndTime = new Date(this.pointsPhase1EndTime);
            const depositTime = new Date(deposit.timestamp);
            console.log(`addBlock check eligible ${depositEthAmount} ${depositTime}`);
            newEligible = (depositEthAmount >= 0.1 && depositTime <= earlyDepositEndTime) ||
                (depositEthAmount >= 0.25 && depositTime > earlyDepositEndTime && depositTime < phase1EndTime);
          }
          if (!newEligible) {
            continue
          }
          if (newEligible != eligible) {
            this.addressEligibleCache.set(deposit.from, newEligible);
          }
          let addrBuf = Buffer.from(deposit.from.startsWith("0x") ? deposit.from.substring(2) : deposit.from, "hex");
          let oldPoint = depositPoints.get(addrBuf);
          let newPoint = oldPoint || 0;
          newPoint += depositPoint;
          depositPoints.set(addrBuf, newPoint);
        }

        // save to db
        await this.pointsRepository.updateDeposits(depositPoints);
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
