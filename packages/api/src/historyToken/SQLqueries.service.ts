import { Injectable, Logger } from "@nestjs/common";
import waitFor from "./waitFor";
import { Worker } from "./worker";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BigNumber } from "ethers";
import { FetSqlRecordStatus } from "./entities/fetSqlRecordStatus.entity";
import { Transfer } from "../transfer/transfer.entity";
import { WithdrawalTxAmount } from "./entities/withdrawalTxAmount.entity";
import { AddressTransaction } from "../transaction/entities/addressTransaction.entity";
import { hexTransformer } from "../common/transformers/hex.transformer";
import { UawAddress } from "./entities/uawAddress.entity";
import { normalizeAddressTransformer } from "../common/transformers/normalizeAddress.transformer";

export const withdrawalTransferAmountSQLName = "getLast14DaysWithdrawalTransferAmount";
export const UAWAddressSQLName = "uawAddressNum";

@Injectable()
export class SQLQueriesService extends Worker {
  private readonly updateSQLRecordStatusInterval: number;
  private readonly logger: Logger;

  public constructor(
      @InjectRepository(FetSqlRecordStatus)
      private readonly fetSqlRecordStatusRepository: Repository<FetSqlRecordStatus>,
      @InjectRepository(WithdrawalTxAmount)
      private readonly withdrawalTxAmountRepository: Repository<WithdrawalTxAmount>,
      @InjectRepository(UawAddress)
      private readonly uawAddressRepository: Repository<UawAddress>,
      @InjectRepository(Transfer)
      private readonly transferRepository: Repository<Transfer>,
      @InjectRepository(AddressTransaction)
      private readonly addressTransactionRepository: Repository<AddressTransaction>,
  ) {
    super();
    this.updateSQLRecordStatusInterval = 1000 * 60 * 5;
    this.logger = new Logger(SQLQueriesService.name);
  }

  protected async runProcess(): Promise<void> {
    try {
      await this.updateWithdrawalAmount();
      await this.updateUawAddressNum();
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
    this.logger.log("service get withdrawal amount :",sourceSQLValue);
    let newTableNumber =  await this.findLastNumberInTransfer();
    if (newTableNumber === 0){
      newTableNumber = Number(resFetSqlRecordStatus.sourceSQLTableNumber);
    }
    await this.updateSQLRecordStatusByName(withdrawalTransferAmountSQLName,newTableNumber,sourceSQLValue)
  }

  public async updateUawAddressNum(){
    const resFetSqlRecordStatus  = await this.findFetSqlRecordStatusByName(UAWAddressSQLName);
    if (resFetSqlRecordStatus === null || resFetSqlRecordStatus === undefined){
      return null;
    }
    const addresses = await this.getNewAddressFromAddressTransactions();
    let records :UawAddress[] = [];
    addresses.forEach(address => {
      const uawAddress = new UawAddress();
      uawAddress.address = normalizeAddressTransformer.from(address.address);
      uawAddress.number = Number(address.number);
      records.push(uawAddress);
    })
    await this.uawAddressRepository.createQueryBuilder("uawAddress").insert().into(UawAddress).values(records).orIgnore().execute();
    let sourceSQLValue = await this.getUawAddressNum();
    if (sourceSQLValue.eq(0)){
      sourceSQLValue = BigNumber.from(resFetSqlRecordStatus.sourceSQLValue);
    }
    let newTableNumber =  await this.findLastNumberInAddressTransactions();
    if (newTableNumber === 0){
      newTableNumber = Number(resFetSqlRecordStatus.sourceSQLTableNumber);
    }
    await this.updateSQLRecordStatusByName(UAWAddressSQLName,newTableNumber,sourceSQLValue);
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
        .andWhere("transfer.number > :number", { number: number })
        .andWhere("transfer.tokenAddress = :tokenAddress", { tokenAddress: tokenAddress })
        .getRawMany();
    if (res === null || res === undefined || res.length === 0){
      return [];
    }
    return res;
  }
  private async getNewAddressFromAddressTransactions(): Promise<AddressTransaction[]>{
    const resFetSqlRecordStatus  = await this.findFetSqlRecordStatusByName(UAWAddressSQLName);
    if (resFetSqlRecordStatus === null || resFetSqlRecordStatus === undefined){
      return [];
    }
    const number =  resFetSqlRecordStatus.sourceSQLTableNumber;

    const res = await this.addressTransactionRepository.createQueryBuilder("addressTransaction")
        .select("*")
        .where("number > :number", { number: number })
        .getRawMany();
    if (res === null || res === undefined || res.length === 0){
      return [];
    }
    return res;
  }
  private async getUawAddressNum(): Promise<BigNumber>{
    const res = await this.uawAddressRepository.createQueryBuilder("uawAddress").getCount();
    if (res === null || res === undefined){
      return BigNumber.from(0);
    }
    return BigNumber.from(res);
  }
  private async updateSQLRecordStatusByName(name: string, tableNumber: number, sourceSQLValue: BigNumber): Promise<void> {
    await this.fetSqlRecordStatusRepository.query('UPDATE public."fetSqlRecordStatus" ' +
        'SET "sourceSQLTableNumber"='+ tableNumber +', "sourceSQLValue"='+ sourceSQLValue +' ' +
        'WHERE "fetSqlRecordStatus".name = \''+ name +'\';')
  }

  public async findFetSqlRecordStatusByName(name : string): Promise<FetSqlRecordStatus> {
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
  private async findLastNumberInAddressTransactions(): Promise<number> {
    const record = await this.addressTransactionRepository.createQueryBuilder("addressTransaction").select("number").orderBy("number","DESC").limit(1).getRawOne();
    if (record === null || record === undefined){
      return 0;
    }
    return Number(record.number);
  }
}
