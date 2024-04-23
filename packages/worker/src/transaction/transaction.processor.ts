import { Injectable, Logger } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Histogram } from "prom-client";
import {
  TransactionRepository,
  TransactionReceiptRepository,
  TransferRepository,
  AddressRepository,
  TokenRepository,
  LogRepository,
} from "../repositories";
import { TRANSACTION_PROCESSING_DURATION_METRIC_NAME } from "../metrics";
import { TransactionData } from "../dataFetcher/types";
import {ConfigService} from "@nestjs/config";
type BridgeConfigFunction = (input: String) => string | undefined;
type GatewayConfigFunction = (input: String) => string | undefined;

@Injectable()
export class TransactionProcessor {
  private readonly logger: Logger;
  private readonly GATEWAYNULLVALUE = 'primary';
  private readonly GATEWAYERROR = 'error';
  configService: ConfigService;
  public readonly getNetworkKeyByL2Erc20Bridge: BridgeConfigFunction;
  public readonly getGateWayKey: GatewayConfigFunction;
  public constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly transactionReceiptRepository: TransactionReceiptRepository,
    private readonly logRepository: LogRepository,
    private readonly transferRepository: TransferRepository,
    private readonly addressRepository: AddressRepository,
    private readonly tokenRepository: TokenRepository,
    @InjectMetric(TRANSACTION_PROCESSING_DURATION_METRIC_NAME)
    private readonly transactionProcessingDurationMetric: Histogram,
    configService: ConfigService
  ) {
    this.logger = new Logger(TransactionProcessor.name);
    this.getNetworkKeyByL2Erc20Bridge = configService.get<BridgeConfigFunction>("bridge.getNetworkKeyByL2Erc20Bridge");
    this.getGateWayKey = configService.get<GatewayConfigFunction>("gateway.getGateWayKey");
  }

  public async add(blockNumber: number, transactionData: TransactionData): Promise<void> {
    const stopTransactionProcessingMeasuring = this.transactionProcessingDurationMetric.startTimer();

    this.logger.debug({
      message: "Saving transactions data to the DB",
      blockNumber: blockNumber,
      transactionHash: transactionData.transaction.hash,
    });
    if (transactionData.transaction.isL1Originated){
      const resTransferList =transactionData.transfers.filter((transfer) => transfer.transactionHash === transactionData.transaction.hash && transfer.gateway !== undefined && transfer.gateway !== null);
      const resTransfer = resTransferList.find((transfer) => transfer.gateway !== '0x' && transfer.gateway !== 'error' );
      if (resTransfer !== undefined && resTransfer !== null && resTransfer.gateway !== null && resTransfer.gateway !== undefined){
        transactionData.transaction.networkKey = this.getGateWayKey(resTransfer.gateway);
      }else if (resTransferList !== undefined && resTransferList !== null && resTransferList.length > 0) {
        transactionData.transaction.networkKey = this.GATEWAYERROR;
      }else {
        transactionData.transaction.networkKey = this.GATEWAYNULLVALUE;
      }
    }
    await this.transactionRepository.add(transactionData.transaction);

    this.logger.debug({
      message: "Saving transaction receipts data to the DB",
      blockNumber: blockNumber,
      transactionHash: transactionData.transaction.hash,
    });
    await this.transactionReceiptRepository.add(transactionData.transactionReceipt);

    this.logger.debug({
      message: "Saving transaction logs data to the DB",
      blockNumber: blockNumber,
      transactionHash: transactionData.transaction.hash,
    });
    await this.logRepository.addMany(
      transactionData.transactionReceipt.logs.map((log) => ({
        ...log,
        timestamp: transactionData.transaction.receivedAt,
      }))
    );

    this.logger.debug({
      message: "Saving transfers data to the DB",
      blockNumber: blockNumber,
      transactionHash: transactionData.transaction.hash,
    });
    await this.transferRepository.addMany(transactionData.transfers);

    this.logger.debug({
      message: "Saving contract addresses data to the DB",
      blockNumber: blockNumber,
      transactionHash: transactionData.transaction.hash,
    });
    await Promise.all(
      transactionData.contractAddresses.map((contractAddress) => {
        return this.addressRepository.upsert({
          address: contractAddress.address,
          bytecode: contractAddress.bytecode,
          createdInBlockNumber: contractAddress.blockNumber,
          creatorTxHash: contractAddress.transactionHash,
          creatorAddress: contractAddress.creatorAddress,
          createdInLogIndex: contractAddress.logIndex,
        });
      })
    );

    this.logger.debug({
      message: "Saving tokens to the DB",
      blockNumber: blockNumber,
      transactionHash: transactionData.transaction.hash,
    });
    await Promise.all(
      transactionData.tokens.map((token) => {
        return this.tokenRepository.upsert(token);
      })
    );

    stopTransactionProcessingMeasuring();
  }
}
