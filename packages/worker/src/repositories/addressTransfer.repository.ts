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
}
