import { Injectable, Logger } from "@nestjs/common";
import { types } from "zksync-web3";
import { Transaction } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { AddressTransactionRepository } from "./addressTransaction.repository";
import {ConfigService} from "@nestjs/config";
import { abi as l2BridgeAbi} from "../abis/L2ERC20Bridge.json";
import { ethers } from "ethers";
type GatewayConfigFunction = (input: String) => string | undefined;

export interface TransactionDto extends types.TransactionResponse {
  fee: string;
  receiptStatus: number;
  isL1Originated: boolean;
  receivedAt: Date;
  error?: string;
  revertReason?: string;
}

@Injectable()
export class TransactionRepository extends BaseRepository<Transaction> {
  configService: ConfigService;
  public readonly getGateWayKey: GatewayConfigFunction;
  public constructor(
    unitOfWork: UnitOfWork,
    private readonly addressTransactionRepository: AddressTransactionRepository,
    configService: ConfigService
  ) {
    super(Transaction, unitOfWork);
    this.getGateWayKey = configService.get<GatewayConfigFunction>("gateway.getGateWayKey");
  }

  public override async add(record: Partial<Transaction>): Promise<void> {
    await super.add(record);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {number, ...addressTransaction} = record;
    const addressTransactions = [
      {
        ...addressTransaction,
        address: record.from,
        transactionHash: record.hash,
      },
    ];
    if (record.from !== record.to) {
      addressTransactions.push({
        ...addressTransaction,
        address: record.to,
        transactionHash: record.hash,
      });
    }
    await this.addressTransactionRepository.addMany(addressTransactions);
  }

  public async countTransactionsOnDate(date: string): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
        `SELECT COUNT(*) AS transaction_count
     FROM transactions
     WHERE DATE("receivedAt") = $1`,
        [date]
    );
    return result[0].transaction_count||0;
  }

  public async updateGateWay(hash: string, gateway: string | null): Promise<void> {
    let networkKey;
    if (gateway === null) {
      networkKey = 'primary';
    } else {
      networkKey = this.getGateWayKey(gateway);
    }
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update(
        this.entityTarget,
        {
          hash,
        },
        {
          networkKey,
        }
    );
  }
}
