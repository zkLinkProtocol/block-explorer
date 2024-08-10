import { Injectable } from "@nestjs/common";
import { MonitAddressHistory} from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";

@Injectable()
export class MonitAddressHistoryRepository extends BaseRepository<MonitAddressHistory> {
  public constructor(unitOfWork: UnitOfWork) {
    super(MonitAddressHistory, unitOfWork);
  }
  // public async insert(record: MonitAddressHistory){
  //   console.log("?????");
  //   const transactionManager = this.unitOfWork.getTransactionManager();
  //   const t = await transactionManager.insert(this.entityTarget, record);
  //   console.log(t);
  // }
  // public async insertRecords(records: MonitAddressHistory){
  //   const transactionManager = this.unitOfWork.getTransactionManager();
  //   await transactionManager.query(`INSERT INTO public."monitAddressHistory"(
  //   address, "zklAmount", change, "timestamp", owner, vested, type, network)
  //   VALUES ('0xBc6c0Dd07E8CadC730b57ad96028D965ad391e45','0','0','2024-08-09','NovaDrop (Lynks NFT Rewards)','N', 'unclaimed tokens','zkLink Nova');`);
  // }
  // public async findYesterdayLastZKLAmount(address :string, time :string){
  //   const transactionManager = this.unitOfWork.getTransactionManager();
  //   const result =  await transactionManager.findOne(this.entityTarget,{
  //     where:{
  //       address,
  //     },
  //     order:{
  //       timestamp: "DESC"
  //     }
  //   });
  //   return result?.zklAmount;
  // }
}
