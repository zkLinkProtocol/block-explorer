import {types} from "zksync-web3";
import {Transfer} from "../../interfaces/transfer.interface";
import {ExtractTransferHandler} from "../../interfaces/extractTransferHandler.interface";
import {TransferType} from "../../transfer.service";
import {TokenType} from "../../../token/token.service";
import {unixTimeToDate} from "../../../utils/date";
import parseLog from "../../../utils/parseLog";
import {CONTRACT_INTERFACES} from "../../../constants";
import {Contract, ethers, providers} from "ethers";
import {ConfigService} from "@nestjs/config";

let getterContract: Contract = null;
const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
const ERROR_GATEWAY = "error";
export const defaultFinalizeDepositMergeHandler: ExtractTransferHandler = {
  matches: (): boolean => true,
  extract: async (
    log: types.Log,
    blockDetails: types.BlockDetails,
    transactionDetails?: types.TransactionDetails,
    configService?: ConfigService
  ): Promise<Transfer> => {
    const primaryChainMainContract = configService.get<string>("primaryChainMainContract");
    const primaryChainRpcUrl = configService.get<string>("primaryChainRpcUrl");
    if (!getterContract) {
      getterContract = new ethers.Contract(
        primaryChainMainContract,
        CONTRACT_INTERFACES.GETTERS_FACET.abi,
        new providers.JsonRpcProvider(primaryChainRpcUrl)
      );
    }
    const parsedLog = parseLog(CONTRACT_INTERFACES.L2_BRIDGE, log);
    let gateway;
    try {
      gateway = (await getterContract.getSecondaryChainOp(log.transactionHash))["gateway"];
      if (gateway === EMPTY_ADDRESS) {
        gateway = null;
      }
    } catch {
      gateway = ERROR_GATEWAY;
    }
    return {
      from: parsedLog.args.l1Sender.toLowerCase(),
      to: parsedLog.args.l2Receiver.toLowerCase(),
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      gateway: gateway,
      amount: parsedLog.args.amount,
      tokenAddress: parsedLog.args.mergeToken.toLowerCase(),
      type: TransferType.Deposit,
      tokenType: TokenType.ERC20,
      isFeeOrRefund: false,
      logIndex: log.logIndex,
      transactionIndex: log.transactionIndex,
      timestamp: transactionDetails?.receivedAt || unixTimeToDate(blockDetails.timestamp),
    };
  },
};
