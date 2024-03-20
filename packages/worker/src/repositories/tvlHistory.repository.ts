import { Injectable } from "@nestjs/common";
import { TVLHistory, Transfer } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { AddressTransferRepository } from "./addressTransfer.repository";

@Injectable()
export class TVLHistoryRepository extends BaseRepository<TVLHistory> {
  public constructor(unitOfWork: UnitOfWork) {
    super(TVLHistory, unitOfWork);
  }
}
