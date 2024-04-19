import { Injectable } from "@nestjs/common";
import { types } from "zksync-web3";
import { Transaction } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { AddressTransactionRepository } from "./addressTransaction.repository";
import {GateWayConfig,GateWayConfigTestNet} from "../utils/gatewayConfig";
import {ConfigService} from "@nestjs/config";
import { abi as l2BridgeAbi} from "../abis/L2ERC20Bridge.json";
import { ethers } from "ethers";

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
  private readonly isTestNet :number;
  configService: ConfigService;
  public constructor(
    unitOfWork: UnitOfWork,
    private readonly addressTransactionRepository: AddressTransactionRepository,
    configService: ConfigService
  ) {
    super(Transaction, unitOfWork);
    this.isTestNet = configService.get<number>("isTestNet");
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
    // if (record.receiptStatus === 0 && record.isL1Originated === true && record.revertReason === "Error function_selector = 0x, data = 0x") {
      // try {
      //   const value = record.data;
      //   const interfaceObj = new ethers.utils.Interface(l2BridgeAbi);
      //   const finalizeDepositToMergeName = "finalizeDepositToMerge";
      //   const finalizeDepositToMergeSignature = interfaceObj.getSighash(finalizeDepositToMergeName);
      //   const finalizeDepositName = "finalizeDeposit";
      //   const finalizeDepositSignature = interfaceObj.getSighash(finalizeDepositName);
      //   if (value.startsWith(functionSignature)) {
      //
      //     const encodedParams = value.slice(10);
      //     const decodedParams = interfaceObj.decodeFunctionData(functionName, encodedParams);
      //
      //     console.log('Decoded Parameters:', decodedParams);
      //   } else {
      //     console.error('Function selector does not match.');
      //   }
      //   addressTransactions.push({
      //     ...addressTransaction,
      //     address: addressResend,
      //     transactionHash: record.hash,
      //   });
      // }catch (error) {
      //
      // }
    // }
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
    const gateWayConfig = this.isTestNet === 0?GateWayConfig:GateWayConfigTestNet;
    for (let key in gateWayConfig) {
      if (gateWayConfig[key] === value) {
        return key;
      }
    }
    return "error";
  }
}
