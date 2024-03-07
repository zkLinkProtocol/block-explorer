import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventProfile, Events } from 'src/conf/events';
import { Address, BlockNumber, ChainId, EventName } from 'src/types';
import { CHAIN_IDS, CHAINS } from 'src/config';
import { EventProcessRepository } from 'src/repositories/eventProcess.repository';
import { providerByChainId } from 'src/utils/providers';
import { BLOCK_CONFIRMATIONS } from 'src/conf/confirmations';
import { providers } from 'ethers';
import { sleep } from 'src/utils/sleep';
import { BatchRootEventLogsRepository } from 'src/repositories';
import { AbiCoder } from 'ethers/lib/utils';
import { BatchRootEventLogs } from 'src/entities';
@Injectable()
export class WatcherService implements OnModuleInit {
  private readonly logger: Logger;
  private readonly lookupProcess: Map<string, number> = new Map();
  public constructor(
    private readonly eventProcessorRepository: EventProcessRepository,
    private readonly batchRootEventLogsRepository: BatchRootEventLogsRepository,
    configService: ConfigService,
  ) {
    console.log('WatcherService constructor ');
    this.logger = new Logger(WatcherService.name);
  }
  async onModuleInit() {
    console.log('WatcherService initialized ');
    this.logger.log('WatcherService initialized');
    console.log('CHAIN_IDS', CHAIN_IDS);
    console.log('CHAINS', CHAINS);
    await this.scanner();
  }
  protected getLookupProcessKey(
    eventName: EventName,
    chainId: ChainId,
    contractAddress: Address,
  ): string {
    return `${eventName}-${chainId}-${contractAddress.toLowerCase()}`;
  }

  protected async scanner(): Promise<void> {
    console.log(Events);
    const events: EventProfile[] = Object.values(Events);
    events.forEach((event: EventProfile) => {
      const eventChains: ChainId[] = Object.keys(event.chains).map((v) =>
        Number(v),
      );
      eventChains.forEach(async (chainId: ChainId) => {
        // If the chainId is not enabled in the environment configuration, then skip the scanning process.
        if (CHAIN_IDS.includes(chainId) !== true) {
          return;
        }

        // Perform block scanning operations for all contract addresses configured in the "chains" section.
        event.chains[chainId].forEach(async (e) => {
          const { contractDeploymentBlock, contractAddress } = e;
          // Resuming the progress of the last block scan
          const eventProcessor = await this.eventProcessorRepository.findOneBy({
            topic: event.topic,
            chainId,
            contractAddress: contractAddress.toLowerCase(),
          });

          const processedBlockNumber = eventProcessor
            ? eventProcessor.processedBlockNumber
            : 0;

          this.logger.debug(
            `${event.name} chainId: ${chainId}, processedBlockNumber: ${processedBlockNumber}, contractDeploymentBlock: ${contractDeploymentBlock}`,
          );
          this.lookupProcess.set(
            this.getLookupProcessKey(event.name, chainId, contractAddress),
            processedBlockNumber || contractDeploymentBlock,
          );
          await this.lookupLogs(
            event.name,
            chainId,
            contractAddress.toLowerCase(),
          );
        });
      });
    });
  }

  protected async lookupLogs(
    eventName: EventName,
    chainId: ChainId,
    contractAddress: Address,
  ): Promise<void> {
    const { viewBlockStep, requestDelay, requestRetryDelay } = CHAINS[chainId];
    const provider = providerByChainId(chainId);
    const event = Events[eventName];
    let fromBlock = this.lookupProcess.get(
      this.getLookupProcessKey(eventName, chainId, contractAddress),
    );
    // Start scanning blocks with the predefined default step size. Usually,
    // this will only be the final value if the scanner falls behind by a number greater than the viewBlockStep.
    let toBlock = fromBlock + viewBlockStep - 1;

    try {
      // Get the current latest block height on the chain,
      // then subtract the number of secure blocks to determine the latest secure block height allowed for scanning.
      // For example, if the current block height is 10000 and the number of secure blocks is 64, then the scanning should stop at 10000 - 64.
      const latestBlock = await provider.getBlockNumber().catch((e) => {
        throw new Error(
          `get ${chainId} latest block number fail, ${e?.message}`,
        );
      });

      // If the calculated toBlock using the default step size is greater than the latest block height,
      // then use the latest block height.
      // This indicates that the service has caught up to the latest block and has been continuously scanning the latest blocks.
      if (toBlock > latestBlock) {
        toBlock = latestBlock;
      }

      // The number of blocks to scan in this iteration will only be queried on the chain when this value is greater than 0.
      // Otherwise, it will wait in place.
      const scanBlockCount = toBlock - fromBlock + 1;

      const confirmations = BLOCK_CONFIRMATIONS[chainId];
      if (!confirmations) {
        throw new Error('confirmations not found');
      }
      if (scanBlockCount < confirmations) {
        fromBlock = toBlock - confirmations + 1;
      }

      const newLogs = await this.fetchLogs(
        provider,
        contractAddress,
        eventName,
        fromBlock,
        toBlock,
      );

      this.logger.debug(
        `[POLLING] ${eventName} ${chainId} ${contractAddress}, ${fromBlock} - ${toBlock} = ${newLogs.length}`,
      );

      if (newLogs && eventName === 'SyncBatchRoot') {
        const abiCoder = new AbiCoder();

        const eventLogsFunc = newLogs.map(
          (log) => async (): Promise<Partial<BatchRootEventLogs>> => {
            const decodedLog = abiCoder.decode(
              ['uint256', 'bytes32', 'uint256'],
              log.data,
            );
            const batchNumber = decodedLog[0];
            const l2LogsRootHash = decodedLog[1];
            const block = await this.getBlock(log.blockNumber, chainId);
            return {
              l1BatchNumber: batchNumber,
              rootHash: l2LogsRootHash,
              transactionHash: log.transactionHash,
              chainId,
              executedAt: new Date(block.timestamp * 1000),
            };
          },
        );
        const eventLogRecords = [];
        for (const eventLog of eventLogsFunc) {
          const eventLogRecord = await eventLog();
          this.logger.debug('eventLogRecord', JSON.stringify(eventLogRecord));
          await sleep(2000);
          eventLogRecords.push(eventLogRecord);
        }
        await this.batchRootEventLogsRepository.addMany(eventLogRecords);
      }

      await this.eventProcessorRepository.upsertEventProcess(
        event.topic,
        chainId,
        contractAddress,
        fromBlock,
      );

      // If it's done over a span smaller than the step size,
      // then it's chasing the latest block and waiting longer for the next iteration,
      // otherwise it's a shorter wait.
      if (scanBlockCount < viewBlockStep) {
        await sleep(requestRetryDelay * 1000);
      } else {
        await sleep(requestDelay * 1000);
      }

      // The starting block of the next iteration is executed as the current ending block + 1
      fromBlock = toBlock + 1;
      this.lookupProcess.set(
        this.getLookupProcessKey(eventName, chainId, contractAddress),
        fromBlock,
      );
      this.lookupLogs(eventName, chainId, contractAddress);
    } catch (e: any) {
      this.logger.error(
        `Lookup catch error, wait ${requestRetryDelay * 1000}ms, ${e.message}`,
      );
      this.logger.error(e);

      await sleep(requestRetryDelay * 1000);
      this.lookupLogs(eventName, chainId, contractAddress);
    }
  }

  protected async fetchLogs(
    provider: providers.JsonRpcProvider,
    contractAddress: Address,
    eventName: EventName,
    fromBlock: BlockNumber,
    toBlock: BlockNumber,
  ) {
    const event = Events[eventName];
    const filter = {
      address: contractAddress,
      topics: [event.topic],
      fromBlock: fromBlock,
      toBlock: toBlock,
    };

    const events = await provider.getLogs(filter);
    return events;
  }

  protected async getBlock(
    blockNumber: BlockNumber,
    chainId: ChainId,
  ): Promise<providers.Block> {
    const provider = providerByChainId(chainId);
    return provider.getBlock(blockNumber);
  }

}
