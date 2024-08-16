import { Injectable } from "@nestjs/common";
import { AddressTransfer } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { FetSqlRecordStatusRepository } from "./fetSqlRecordStatus.repository";
import { BigNumber } from "ethers";

@Injectable()
export class AddressTransferRepository extends BaseRepository<AddressTransfer> {
  public constructor(unitOfWork: UnitOfWork,private readonly fetSqlRecordStatusRepository: FetSqlRecordStatusRepository) {
    super(AddressTransfer, unitOfWork);
  }
  public async getUawNumber(): Promise<BigNumber> {
    return await this.fetSqlRecordStatusRepository.getUawAddressNum();
  }

  public async findAll(address :string, tokenAddress :string, fromDate :string, toDate :string){
    const transactionManager = this.unitOfWork.getTransactionManager();
    const queryBuilder = transactionManager.createQueryBuilder(this.entityTarget, 'addressTransfers');
    queryBuilder.leftJoinAndSelect("addressTransfers._transfer", "transfer");
    queryBuilder.where('addressTransfers.address = :address',{ address: Buffer.from(address.replace("0x",""),"hex") })
    queryBuilder.andWhere('addressTransfers.tokenAddress = :tokenAddress',{ tokenAddress: Buffer.from(tokenAddress.replace("0x",""),"hex") })
    queryBuilder.andWhere('addressTransfers.timestamp > :fromDate',{ fromDate })
    queryBuilder.andWhere('addressTransfers.timestamp <= :toDate',{ toDate })
    queryBuilder.orderBy("addressTransfers.timestamp", "DESC");
    queryBuilder.addOrderBy("addressTransfers.logIndex", "ASC");
    return await queryBuilder.execute();
  }
}
