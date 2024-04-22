import { Injectable } from "@nestjs/common";
import { types } from "zksync-web3";
import { Transaction } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { AddressTransactionRepository } from "./addressTransaction.repository";
import {ConfigService} from "@nestjs/config";
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
  public async updateGateWay(hash: string, gateway: string | null): Promise<void> {
    let networkKey;
    if (gateway === null) {
      networkKey = 'linea';
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
