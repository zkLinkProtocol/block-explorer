import { Injectable } from "@nestjs/common";
import { Transfer , TransferType} from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { BigNumber } from "ethers";

@Injectable()
export class TransferRepository extends BaseRepository<Transfer> {
  public constructor(unitOfWork: UnitOfWork) {
    super(Transfer, unitOfWork);
  }

  public async findAll(tokenAddress :string, fromBlockNumber :string, toBlockNumber :string){
    const transactionManager = this.unitOfWork.getTransactionManager();
    const queryBuilder = transactionManager.createQueryBuilder(this.entityTarget, 'transfers');
    queryBuilder.where('transfers.tokenAddress = :tokenAddress',{ tokenAddress: Buffer.from(tokenAddress.replace("0x",""),"hex") })
    queryBuilder.andWhere('transfers.blockNumber >= :fromBlockNumber',{ fromBlockNumber })
    queryBuilder.andWhere('transfers.blockNumber <= :toBlockNumber',{ toBlockNumber })
    queryBuilder.orderBy("transfers.blockNumber", "ASC");
    queryBuilder.addOrderBy("transfers.logIndex", "ASC");
    return await queryBuilder.execute();
  }
}
