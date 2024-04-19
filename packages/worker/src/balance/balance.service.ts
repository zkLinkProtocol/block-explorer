import { Injectable, Logger } from "@nestjs/common";
import { BigNumber } from "ethers";
import { Histogram } from "prom-client";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { BalanceRepository } from "../repositories";
import { Balance, TokenType } from "../entities";
import { Balance as ChangedBalance } from "../dataFetcher/types";

import { DELETE_OLD_BALANCES_DURATION_METRIC_NAME, DELETE_ZERO_BALANCES_DURATION_METRIC_NAME } from "../metrics";

@Injectable()
export class BalanceService {
  private readonly logger: Logger;
  public changedBalances: Map<number, Map<string, Map<string, { balance: BigNumber; tokenType: TokenType }>>>;

  constructor(
    private readonly balanceRepository: BalanceRepository,
    @InjectMetric(DELETE_OLD_BALANCES_DURATION_METRIC_NAME)
    private readonly deleteOldBalancesDurationMetric: Histogram,
    @InjectMetric(DELETE_ZERO_BALANCES_DURATION_METRIC_NAME)
    private readonly deleteZeroBalancesDurationMetric: Histogram
  ) {
    this.logger = new Logger(BalanceService.name);
    this.changedBalances = new Map<number, Map<string, Map<string, { balance: BigNumber; tokenType: TokenType }>>>();
  }

  public async saveChangedBalances(changedBalances: ChangedBalance[]): Promise<void> {
    await this.balanceRepository.addMany(changedBalances);
  }

  public async getAllAddresses(): Promise<Buffer[]> {
    return await this.balanceRepository.getAllAddresses();
  }

  public async getAccountBalances(address: Buffer): Promise<Balance[]> {
    return await this.balanceRepository.getAccountBalances(address);
  }

  public async getAccountBalancesByBlock(address: Buffer, block: number): Promise<Balance[]> {
    return await this.balanceRepository.getAccountBalancesByBlock(address, block);
  }

  public getERC20TokensForChangedBalances(changedBalances: ChangedBalance[]): string[] {
    const tokens = new Set<string>();
    for (const { tokenType, tokenAddress } of changedBalances) {
      if (tokenType === TokenType.ERC20) {
        tokens.add(tokenAddress);
      }
    }
    return Array.from(tokens);
  }

  public async deleteOldBalances(fromBlockNumber: number, toBlockNumber: number): Promise<void> {
    this.logger.log({ message: "Deleting old balances", fromBlockNumber, toBlockNumber });
    const stopDeleteBalancesDurationMeasuring = this.deleteOldBalancesDurationMetric.startTimer();
    const blockStep = 5000;
    try {
      let startBlockNumber = fromBlockNumber;
      while (startBlockNumber < toBlockNumber) {
        const endBlockNumber = Math.min(startBlockNumber + blockStep, toBlockNumber);
        await this.balanceRepository.deleteOldBalances(startBlockNumber, endBlockNumber);
        startBlockNumber = endBlockNumber;
      }
    } catch (error) {
      this.logger.error("Error on deleting old balances", error.stack);
    }
    stopDeleteBalancesDurationMeasuring();
  }

  public async deleteZeroBalances(fromBlockNumber: number, toBlockNumber: number): Promise<void> {
    this.logger.log({ message: "Deleting zero balances", fromBlockNumber, toBlockNumber });
    const stopDeleteBalancesDurationMeasuring = this.deleteZeroBalancesDurationMetric.startTimer();
    try {
      await this.balanceRepository.deleteZeroBalances(fromBlockNumber, toBlockNumber);
    } catch (error) {
      this.logger.error("Error on deleting zero balances", error.stack);
    }
    stopDeleteBalancesDurationMeasuring();
  }

  public async getDeleteBalancesFromBlockNumber(): Promise<number> {
    return await this.balanceRepository.getDeleteBalancesFromBlockNumber();
  }

  public async setDeleteBalancesFromBlockNumber(fromBlockNumber: number): Promise<void> {
    await this.balanceRepository.setDeleteBalancesFromBlockNumber(fromBlockNumber);
  }
}
