import {Injectable} from "@nestjs/common";
import {UnitOfWork} from "../unitOfWork";
import {BaseRepository} from "./base.repository";
import {Balance} from "../entities";
import {In} from "typeorm";

@Injectable()
export class BalanceRepository extends BaseRepository<Balance> {
  public constructor(unitOfWork: UnitOfWork) {
    super(Balance, unitOfWork);
  }

  public async findOne(address: string, tokenAddress: string){
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.findOne(this.entityTarget,{
      where: {
        address,
        tokenAddress,
      },
      select: {
        balance: true,
      },
      order: {
        blockNumber: "DESC",
      },
    });
    return result?.balance || "0" ;
  }

  public async findAllAddressAmount(addressList: string[], tokenAddress: string){
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.find(this.entityTarget, {
      where: {
        address: In(addressList),
        tokenAddress,
      },
      order: {
        blockNumber: "DESC",
      },
    }) ;
  }
}
