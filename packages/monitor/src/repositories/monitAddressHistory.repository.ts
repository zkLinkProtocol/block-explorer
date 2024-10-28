import { Injectable } from "@nestjs/common";
import { MonitAddressHistory} from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { LessThanOrEqual } from "typeorm";

@Injectable()
export class MonitAddressHistoryRepository extends BaseRepository<MonitAddressHistory> {
  public constructor(unitOfWork: UnitOfWork) {
    super(MonitAddressHistory, unitOfWork);
  }
  public async findYesterdayLastZKLAmount(address :string, network :string, owner :string, time? :string){
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = time? await transactionManager.findOne(this.entityTarget,{
      where:{
        address,
        network,
        owner,
        timestamp: LessThanOrEqual(new Date(time))
      },
      order:{
        timestamp: "DESC"
      }
    })
    : await transactionManager.findOne(this.entityTarget,{
          where:{
            address,
            network,
            owner
          },
          order:{
            timestamp: "DESC"
          }
        });
    return result?.zklAmount?.toString() ?? '0';
  }
}
