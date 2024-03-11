import { types, utils } from "zksync-web3";
import { Injectable, Logger } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { In } from "typeorm";
import { Histogram } from "prom-client";
import { LogType, isLogOfType } from "../log/logType";
import { BlockchainService } from "../blockchain/blockchain.service";
import { AddressRepository, TokenRepository } from "../repositories";
import { GET_TOKEN_INFO_DURATION_METRIC_NAME } from "../metrics";
import { ContractAddress } from "../dataFetcher/types";
import parseLog from "../utils/parseLog";
import { stringTransformer } from "../transformers/string.transformer";
import { CONTRACT_INTERFACES } from "../constants";
import { Token as TokenEntity } from "../entities";
import tokens from "../../tokens";

export interface TokenL1Address {
  chain: string,
  l1Address: string,
  l2Address: string,
}
export interface Token {
  address: TokenL1Address[];
  symbol: string;
  decimals: number;
  cgPriceId: string;
  type: string;
  yieldType: string[];
  multiplier: number;
}
@Injectable()
export class TokenService {
  private readonly logger: Logger;
  private supportTokens: Token[];

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly addressRepository: AddressRepository,
    private readonly tokenRepository: TokenRepository,
    @InjectMetric(GET_TOKEN_INFO_DURATION_METRIC_NAME)
    private readonly getTokenInfoDurationMetric: Histogram,
  ) {
    this.logger = new Logger(TokenService.name);
    this.supportTokens = [];
    tokens.forEach(token => {
      this.supportTokens.push(token);
    });
  }

  public getCgIdByTokenSymbol(tokenSymbol:string): string {
    let token = this.supportTokens.find(t => t.symbol == tokenSymbol);
    if (!token) {
      return "";
    } else {
      return token.cgPriceId
    }
  }

  public getTokenMultiplier(tokenSymbol: string): number {
    let token = this.supportTokens.find(t => t.symbol == tokenSymbol);
    if (!token) {
      return 0;
    } else {
      return token.multiplier;
    }
  }

  // public async saveETH(): Promise<void> {
  //   return await this.tokenRepository.saveETH();
  // }

  public async getAllTokens(): Promise<TokenEntity[]> {
    return await this.tokenRepository.getAllTokens();
  }

  public getAllSupportTokens(): Token[] {
    return this.supportTokens;
  }

  public isSupportToken(tokenAddress: string): boolean {
    for (const token of this.supportTokens) {
      if (token.address.find(t => t.l2Address.toLowerCase() == tokenAddress.toLowerCase())) {
          return true;
      }
    }
    return false;
  }

  public getSupportToken(tokenAddress: string): Token | undefined {
    for (const token of this.supportTokens) {
      if (token.address.find(t => t.l2Address.toLowerCase() == tokenAddress.toLowerCase())) {
        return token;
      }
    }
    return undefined;
  }

  private async getERC20Token(contractAddress: string): Promise<{
    symbol: string;
    decimals: number;
    name: string;
  }> {
    try {
      return await this.blockchainService.getERC20TokenData(contractAddress);
    } catch {
      this.logger.log({
        message: "Cannot parse ERC20 contract. Might be a token of a different type.",
        contractAddress,
      });
      return null;
    }
  }

  public async saveERC20Token(
    contractAddress: ContractAddress,
    transactionReceipt?: types.TransactionReceipt
  ): Promise<void> {
    let erc20Token: {
      symbol: string;
      decimals: number;
      name: string;
      l1Address?: string;
      networkKey?: string;
    };
    const networkKey = transactionReceipt
      ? this.blockchainService.getNetworkKeyByL2Erc20Bridge(transactionReceipt.to.toLowerCase())
      : undefined;
    const bridgeLog =
      // transactionReceipt &&
      // transactionReceipt.to.toLowerCase() === this.blockchainService.bridgeAddresses.l2Erc20DefaultBridge
      networkKey &&
      transactionReceipt.logs?.find(
        (log) =>
          isLogOfType(log, [LogType.BridgeInitialization, LogType.BridgeInitialize]) &&
          log.address.toLowerCase() === contractAddress.address.toLowerCase()
      );

    if (bridgeLog) {
      const parsedLog = parseLog(CONTRACT_INTERFACES.L2_STANDARD_ERC20, bridgeLog);
      erc20Token = {
        name: parsedLog.args.name,
        symbol: parsedLog.args.symbol,
        decimals: parsedLog.args.decimals,
        l1Address: parsedLog.args.l1Token,
        networkKey: networkKey,
      };
    } else {
      const stopGetTokenInfoDurationMetric = this.getTokenInfoDurationMetric.startTimer();
      erc20Token = await this.getERC20Token(contractAddress.address);
      if (erc20Token) {
        stopGetTokenInfoDurationMetric();
      }
    }

    if (this.removeSpecialChars(erc20Token?.symbol)) {
      this.logger.debug({
        message: "Adding ERC20 token to the DB",
        blockNumber: contractAddress.blockNumber,
        transactionHash: contractAddress.transactionHash,
        tokenAddress: contractAddress.address,
      });
      await this.tokenRepository.upsert({
        ...erc20Token,
        blockNumber: contractAddress.blockNumber,
        transactionHash: contractAddress.transactionHash,
        l2Address: contractAddress.address,
        logIndex: contractAddress.logIndex,
        // add L1 address for ETH token
        ...(contractAddress.address.toLowerCase() === utils.L2_ETH_TOKEN_ADDRESS && {
          l1Address: utils.ETH_ADDRESS,
        }),
      });
    }
  }

  private removeSpecialChars(str: string | null): string {
    return stringTransformer.to(str);
  }

  public async saveERC20Tokens(tokenAddresses: string[]): Promise<void> {
    const existingTokens = await this.findWhereInList(
      (tokenAddressesBatch) =>
        this.tokenRepository.find({
          where: {
            l2Address: In(tokenAddressesBatch),
          },
          select: ["l2Address"],
        }),
      tokenAddresses
    );

    const tokensToSave = tokenAddresses.filter(
      (token) => !existingTokens.find((t) => t.l2Address.toLowerCase() === token.toLowerCase())
    );
    // fetch tokens contracts, if contract is not saved yet skip saving token
    const tokensToSaveContracts = await this.findWhereInList(
      (tokenAddressesBatch) =>
        this.addressRepository.find({
          where: {
            address: In(tokenAddressesBatch),
          },
        }),
      tokensToSave
    );

    await Promise.all(
      tokensToSaveContracts.map((tokenContract) =>
        this.saveERC20Token({
          address: tokenContract.address,
          blockNumber: tokenContract.createdInBlockNumber,
          transactionHash: tokenContract.creatorTxHash,
          creatorAddress: tokenContract.creatorAddress,
          logIndex: tokenContract.createdInLogIndex,
        } as ContractAddress)
      )
    );
  }

  private async findWhereInList<T>(
    handler: (list: string[]) => Promise<T[]>,
    list: string[],
    batchSize = 500
  ): Promise<T[]> {
    const result: T[] = [];

    let batch = [];
    for (let i = 0; i < list.length; i++) {
      batch.push(list[i]);
      if (batch.length === batchSize || i === list.length - 1) {
        const batchResult = await handler(batch);
        result.push(...batchResult);
        batch = [];
      }
    }

    return result;
  }
}
