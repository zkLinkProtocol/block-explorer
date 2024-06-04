import { Injectable } from "@nestjs/common";
import { FetSqlRecordStatus } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { BigNumber } from "ethers";

const withdrawalTransferAmountSQLName = "getLast14DaysWithdrawalTransferAmount";
const UAWAddressSQLName = "uawAddressNum";
@Injectable()
export class FetSqlRecordStatusRepository extends BaseRepository<FetSqlRecordStatus> {
  public constructor(unitOfWork: UnitOfWork) {
    super(FetSqlRecordStatus, unitOfWork);
  }
  public async findFetSqlRecordStatusByName(name : string): Promise<FetSqlRecordStatus> {
    const record = await this.unitOfWork.getTransactionManager().query(`
        SELECT "sourceSQLTableNumber", "sourceSQLValue" 
        FROM public."fetSqlRecordStatus" 
        where "fetSqlRecordStatus".name = $1 ;`,[name]);
    if (record === null || record === undefined || record.length === 0){
      return null;
    }
    return record[0];
  }
  public async getLast7DaysWithdrawalTransferAmount(): Promise<BigNumber> {
    const resFetSqlRecordStatus  = await this.findFetSqlRecordStatusByName(withdrawalTransferAmountSQLName);
    if (resFetSqlRecordStatus === null || resFetSqlRecordStatus === undefined){
      return BigNumber.from(0);
    }
    return BigNumber.from(resFetSqlRecordStatus.sourceSQLValue);
  }
}
