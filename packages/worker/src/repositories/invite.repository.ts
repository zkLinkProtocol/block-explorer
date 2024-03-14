import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { ReferralUnitOfWork } from "../unitOfWork";
import { Invite } from "../entities";

@Injectable()
export class InviteRepository extends BaseRepository<Invite> {
  public constructor(unitOfWork: ReferralUnitOfWork) {
    super(Invite, unitOfWork);
  }
}
