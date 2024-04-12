import { Injectable } from "@nestjs/common";
import { types } from "zksync-web3";
import { Transaction } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { AddressTransactionRepository } from "./addressTransaction.repository";
import {GateWayConfig} from "../utils/gatewayConfig";

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
  public constructor(
    unitOfWork: UnitOfWork,
    private readonly addressTransactionRepository: AddressTransactionRepository
  ) {
    super(Transaction, unitOfWork);
  }

  public override async add(record: Partial<Transaction>): Promise<void> {
    await super.add(record);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { number, ...addressTransaction } = record;
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
  public async updateGateWay(hash: string, gateway: string | null): Promise<void> {
    let networkKey;
    if (gateway === null) {
      networkKey = 'linea';
    } else {
      networkKey = this.findGatewayByAddress(gateway);
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

  private  findGatewayByAddress(value: string): string {
    for (let key in GateWayConfig) {
      if (GateWayConfig[key] === value) {
        return key;
      }
    }
    return "error";
  }
}
