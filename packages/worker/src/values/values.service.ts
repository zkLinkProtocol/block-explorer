import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import waitFor from "../utils/waitFor";
import { Worker } from "../common/worker";
import { TokenRepository } from "../repositories";
import { JsonRpcProviderBase } from "../rpcProvider";
import { Token } from "../entities";
import { BigNumber , ethers} from "ethers";
import { sleep } from "zksync-web3/build/src/utils";
import { providerByChainId } from "../utils/providers";
import { networkChainIdMap } from "../config";
const UPDATE_TOKENS_BATCH_SIZE = 3;
type BridgeConfigFunction = (input: String) => string | undefined;

@Injectable()
export class ValuesService extends Worker {
  private readonly updateTotalLockedValueInterval: number;
  private readonly updateTotalLockedValueDelay: number;
  private readonly logger: Logger;
  public readonly getL1Erc20Bridge: BridgeConfigFunction;

  public constructor(
    private readonly tokenRepository: TokenRepository,
    private readonly provider: JsonRpcProviderBase,
    configService: ConfigService
  ) {
    super();
    this.updateTotalLockedValueInterval = configService.get<number>("tokens.updateTotalLockedValueInterval");
    this.updateTotalLockedValueDelay = configService.get<number>("tokens.updateTotalLockedValueDelay");
    this.getL1Erc20Bridge = configService.get<BridgeConfigFunction>("bridge.getL1Erc20Bridge");
    this.logger = new Logger(ValuesService.name);
  }

  protected async runProcess(): Promise<void> {
    try {
      const bridgedTokens = await this.tokenRepository.find({});
      const tokensToUpdate = bridgedTokens.map((t) => async () => {
        return {
          ...t,
          totalSupply: await this.getTokensTotalSupply(t),
          reserveAmount: await this.getTokensReserveAmount(t),
        };
      });
      let updateTokensTasks = [];
      for (let i = 0; i < tokensToUpdate.length; i++) {
        const tu = await tokensToUpdate[i](); // send eth_call
        await sleep(this.updateTotalLockedValueDelay);
        updateTokensTasks.push(
          this.tokenRepository.updateTokenTotalSupply({
            l2Address: tu.l2Address,
            totalSupply: tu.totalSupply,
          })
        );
        updateTokensTasks.push(
          this.tokenRepository.updateTokenReserveAmount({
            l2Address: tu.l2Address,
            reserveAmount: tu.reserveAmount,
          })
        )
        if (updateTokensTasks.length === UPDATE_TOKENS_BATCH_SIZE || i === tokensToUpdate.length - 1) {
          await Promise.all(updateTokensTasks);
          updateTokensTasks = [];
        }
      }
    } catch (err) {
      this.logger.error({
        message: "Failed to update tokens total supply data",
        originalError: err,
      });
    }

    await waitFor(() => !this.currentProcessPromise, this.updateTotalLockedValueInterval);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }

  private async getTokensTotalSupply(token: Token): Promise<BigNumber> {
    // function totalSupply() public view returns (uint256)
    const balance = await this.provider.send("eth_call", [{ to: token.l2Address, data: "0x18160ddd" }, "latest"]);
    this.logger.debug(` ${token.symbol} total supply: ${balance.toString()} `);
    return balance;
  }
  private async getTokensReserveAmount(token: Token): Promise<BigNumber> {
    if (token.networkKey in networkChainIdMap) {
      const chainId = networkChainIdMap[token.networkKey];
      const provider = providerByChainId(chainId);
      const func = ethers.utils.FunctionFragment.from(
        `balanceOf(address)`
      );
      const iface = new ethers.utils.Interface([func]);
      const data = iface.encodeFunctionData(func, [this.getL1Erc20Bridge(token.networkKey)])
      const balance = await provider.send("eth_call", [{ to: token.l1Address, data }, "latest"]);
      this.logger.debug(` ${token.symbol} reserve amount: ${balance.toString()} `);
      return balance;
    } else {
      return BigNumber.from(0);
    }
  }
}
