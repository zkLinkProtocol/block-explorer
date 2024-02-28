import { types } from "zksync-web3";
import { Transfer } from "./transfer.interface";
import { ConfigService } from "@nestjs/config";

export interface ExtractTransferHandler {
  matches: (log: types.Log, txReceipt?: types.TransactionReceipt) => boolean;
  extract: (
    log: types.Log,
    blockDetails: types.BlockDetails,
    transactionDetails?: types.TransactionDetails,
    configService?: ConfigService
  ) => Transfer | null | Promise<Transfer>;
}
