import { utils, types } from "zksync-web3";
import { Transfer } from "../../interfaces/transfer.interface";
import { ExtractTransferHandler } from "../../interfaces/extractTransferHandler.interface";
import { TransferType } from "../../transfer.service";
import { TokenType } from "../../../token/token.service";
import { unixTimeToDate } from "../../../utils/date";
import parseLog from "../../../utils/parseLog";
import { CONTRACT_INTERFACES } from "../../../constants";
import { ConfigService } from "@nestjs/config";
import { Contract, ethers, providers } from "ethers";
import {timeout} from '../../../utils/timeout';
let getterContract: Contract = null;
const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
const ERROR_GATEWAY = "error";
export const ethMintFromL1Handler: ExtractTransferHandler = {
  matches: (log: types.Log): boolean => log.address.toLowerCase() === utils.L2_ETH_TOKEN_ADDRESS,
  extract: async (
    log: types.Log,
    blockDetails: types.BlockDetails,
    transactionDetails?: types.TransactionDetails,
    configService?: ConfigService
  ): Promise<Transfer> => {
    const parsedLog = parseLog(CONTRACT_INTERFACES.ETH_TOKEN, log);
    const primaryChainMainContract = configService.get<string>("primaryChainMainContract");
    const primaryChainRpcUrl = configService.get<string>("primaryChainRpcUrl");
    if (!getterContract) {
      getterContract = new ethers.Contract(
        primaryChainMainContract,
        CONTRACT_INTERFACES.GETTERS_FACET.abi,
        new providers.JsonRpcProvider(primaryChainRpcUrl)
      );
    }
    let gateway;
    try {
      await timeout(3000, new Promise<void>(async (resolve, reject) => {
        gateway = (await getterContract.getSecondaryChainOp(log.transactionHash))["gateway"];
        if (gateway === EMPTY_ADDRESS) {
          gateway = null;
        }
        resolve();
      }));
    } catch {
      gateway = ERROR_GATEWAY; //TODO Regularly maintain the transfers data table. When there are too many ERROR_GATEWAYs in the table, check the getSecondaryChainOp method.
    }
    return {
      from: parsedLog.args.account.toLowerCase(),
      to: parsedLog.args.account.toLowerCase(),
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      gateway: gateway,
      amount: parsedLog.args.amount,
      tokenAddress: utils.L2_ETH_TOKEN_ADDRESS,
      type: TransferType.Deposit,
      tokenType: TokenType.ETH,
      isFeeOrRefund: false,
      logIndex: log.logIndex,
      transactionIndex: log.transactionIndex,
      timestamp: transactionDetails?.receivedAt || unixTimeToDate(blockDetails.timestamp),
    };
  },
};
