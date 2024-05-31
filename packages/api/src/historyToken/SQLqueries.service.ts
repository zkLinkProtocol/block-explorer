import { Injectable, Logger } from "@nestjs/common";
import waitFor from "./waitFor";
import { Worker } from "./worker";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BigNumber } from "ethers";
import { FetSqlRecordStatus } from "./entities/fetSqlRecordStatus.entity";
import { Transfer } from "../transfer/transfer.entity";
import { WithdrawalTxAmount } from "./entities/withdrawalTxAmount.entity";
import { hexTransformer } from "../common/transformers/hex.transformer";

const withdrawalTransferAmountSQLName = "getLast14DaysWithdrawalTransferAmount";

@Injectable()
export class SQLQueriesService extends Worker {
  private readonly updateSQLRecordStatusInterval: number;
  private readonly logger: Logger;

  public constructor(
      @InjectRepository(FetSqlRecordStatus)
      private readonly fetSqlRecordStatusRepository: Repository<FetSqlRecordStatus>,
      @InjectRepository(WithdrawalTxAmount)
      private readonly withdrawalTxAmountRepository: Repository<WithdrawalTxAmount>,
      @InjectRepository(Transfer)
      private readonly transferRepository: Repository<Transfer>,
  ) {
    super();
    this.updateSQLRecordStatusInterval = 1000 * 60 * 5;
    this.logger = new Logger(SQLQueriesService.name);
  }

  protected async runProcess(): Promise<void> {
    try {
      await this.updateWithdrawalAmount();
    } catch (err) {
      this.logger.error({
        message: "Failed to update sql record status",
        originalError: err,
      });
      console.log(err);
    }

    await waitFor(() => !this.currentProcessPromise, this.updateSQLRecordStatusInterval);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }
  public async updateWithdrawalAmount(){
    const resFetSqlRecordStatus  = await this.findFetSqlRecordStatusByName(withdrawalTransferAmountSQLName);
    if (resFetSqlRecordStatus === null || resFetSqlRecordStatus === undefined){
      return null;
    }
    let sourceSQLValue = BigNumber.from(resFetSqlRecordStatus.sourceSQLValue);
    const removeAmount = await this.removeOut14DaysTransfer();
    let addAmount = BigNumber.from(0);
    const transfers = await this.getLastSourceSQLTableNumberWithdrawalTransfers();
    let records : WithdrawalTxAmount[] = [];
    transfers.forEach(transfer =>{
      const withdrawalTxAmount = new WithdrawalTxAmount();
      withdrawalTxAmount.amount = transfer.amount;
      withdrawalTxAmount.number = transfer.number;
      withdrawalTxAmount.transactionHash = hexTransformer.from(transfer.transactionHash);
      withdrawalTxAmount.timestamp = transfer.timestamp;
      addAmount = addAmount.add(BigNumber.from(transfer.amount));
      records.push(withdrawalTxAmount);
    })
    await this.withdrawalTxAmountRepository.createQueryBuilder("withdrawalTxAmount").insert().into(WithdrawalTxAmount).values(records).execute();
    sourceSQLValue = sourceSQLValue.add(addAmount).sub(removeAmount);
    let newTableNumber =  await this.findLastNumberInTransfer();
    if (newTableNumber === 0){
      newTableNumber = Number(resFetSqlRecordStatus.sourceSQLTableNumber);
    }
    await this.updateSQLRecordStatusByName(withdrawalTransferAmountSQLName,newTableNumber,sourceSQLValue)
  }

  private async removeOut14DaysTransfer() {
    const time = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const res = await this.withdrawalTxAmountRepository.query('SELECT "withdrawalTxAmount".amount FROM public."withdrawalTxAmount" ' +
        'WHERE "withdrawalTxAmount".timestamp < \''+ time +'\';');
    let ans = BigNumber.from(0);
    res.forEach(r => {
      ans = ans.add(BigNumber.from(r.amount));
    })
    await this.withdrawalTxAmountRepository.query('DELETE FROM public."withdrawalTxAmount" ' +
        'WHERE "withdrawalTxAmount".timestamp < \''+ time +'\';');
    return ans;
  }
  private async getLastSourceSQLTableNumberWithdrawalTransfers(): Promise<Transfer[]> {
    const resFetSqlRecordStatus  = await this.findFetSqlRecordStatusByName(withdrawalTransferAmountSQLName);
    if (resFetSqlRecordStatus === null || resFetSqlRecordStatus === undefined){
      return [];
    }
    const number =  resFetSqlRecordStatus.sourceSQLTableNumber;
    const tokenAddress = Buffer.from("000000000000000000000000000000000000800A", 'hex');

    const res = await this.transferRepository.createQueryBuilder("transfer")
        .select("transfer.*")
        .where("transfer.type = :type", { type: "withdrawal" })
        .andWhere("transfer.number >= :number", { number: number })
        .andWhere("transfer.tokenAddress = :tokenAddress", { tokenAddress: tokenAddress })
        .getRawMany();
    if (res === null || res === undefined || res.length === 0){
      return [];
    }
    return res;
  }
  private async updateSQLRecordStatusByName(name: string, tableNumber: number, sourceSQLValue: BigNumber): Promise<void> {
    await this.fetSqlRecordStatusRepository.query('UPDATE public."fetSqlRecordStatus" ' +
        'SET "sourceSQLTableNumber"='+ tableNumber +', "sourceSQLValue"='+ sourceSQLValue +' ' +
        'WHERE "fetSqlRecordStatus".name = \''+ name +'\';')
  }

  private async findFetSqlRecordStatusByName(name : string): Promise<FetSqlRecordStatus> {
    const record = await this.fetSqlRecordStatusRepository.query('SELECT "sourceSQLTableNumber", "sourceSQLValue" ' +
        'FROM public."fetSqlRecordStatus" ' +
        'where "fetSqlRecordStatus".name = \''+ name +'\' ;');
    if (record === null || record === undefined || record.length === 0){
      return null;
    }
    return record[0];
  }
  private async findLastNumberInTransfer(): Promise<number> {
    const record = await this.transferRepository.createQueryBuilder("transfer").select("number").orderBy("transfer.number","DESC").limit(1).getRawOne();
    if (record === null || record === undefined){
      return 0;
    }
    return Number(record.number);
  }

}
