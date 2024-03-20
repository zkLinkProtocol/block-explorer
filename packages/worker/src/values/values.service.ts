import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import waitFor from "../utils/waitFor";
import { Worker } from "../common/worker";
import { BlockRepository, TVLHistoryRepository, TokenRepository } from "src/repositories";
import { JsonRpcProviderBase } from "src/rpcProvider";
import { Block, Token } from "src/entities";
import { BigNumber } from "ethers";
import { sleep } from "zksync-web3/build/src/utils";
const UPDATE_TOKENS_BATCH_SIZE = 3;

@Injectable()
export class ValuesService extends Worker {
  private readonly updateTotalLockedValueInterval: number;
  private readonly updateTotalLockedValueDelay: number;
  private readonly logger: Logger;

  public constructor(
    private readonly tokenRepository: TokenRepository,
    private readonly tvlHistoryRepository: TVLHistoryRepository,
    private readonly blockRepository: BlockRepository,
    private readonly provider: JsonRpcProviderBase,
    configService: ConfigService
  ) {
    super();
    this.updateTotalLockedValueInterval = configService.get<number>("tokens.updateTotalLockedValueInterval");
    this.updateTotalLockedValueDelay = configService.get<number>("tokens.updateTotalLockedValueDelay");
    this.logger = new Logger(ValuesService.name);
  }

  protected async runProcess(): Promise<void> {
    try {
      const bridgedTokens = await this.tokenRepository.find({});
      const tokensToUpdate = bridgedTokens.map((t) => async () => {
        return {
          ...t,
          totalSupply: await this.getTokensTotalSupply(t),
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
        if (updateTokensTasks.length === UPDATE_TOKENS_BATCH_SIZE || i === tokensToUpdate.length - 1) {
          await Promise.all(updateTokensTasks);
          updateTokensTasks = [];
        }
      }

      await this.recordTVLHistory();
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
    const balance = await this.provider.send("eth_call", [{ to: token.l2Address, data: "0x18160ddd" }, "latest"]);
    this.logger.debug(` ${token.symbol} total supply: ${balance.toString()} `);
    return balance;
  }

  private async recordTVLHistory(): Promise<void> {
    const block: Block = await this.blockRepository.getLastBlock({ select: { number: true, timestamp: true } });
    const totalTVL = await this.tokenRepository.getTotalTVL();

    await this.tvlHistoryRepository.add({
      blockNumber: block.number,
      timestamp: block.timestamp,
      tvl: totalTVL,
    });
  }
}
