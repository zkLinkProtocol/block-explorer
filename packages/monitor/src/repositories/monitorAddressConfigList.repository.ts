import { Injectable } from "@nestjs/common";
import { MonitAddressConfigList } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { FindManyOptions, MoreThanOrEqual } from "typeorm";
import { BigNumber } from "ethers";

@Injectable()
export class MonitAddressConfigListRepository extends BaseRepository<MonitAddressConfigList> {
  public constructor(unitOfWork: UnitOfWork) {
    super(MonitAddressConfigList, unitOfWork);
  }

}
