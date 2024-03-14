import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { ReferralUnitOfWork } from "../unitOfWork";
import { Invite } from "../entities";
import { hexTransformer } from "../transformers/hex.transformer";

@Injectable()
export class InviteRepository extends BaseRepository<Invite> {
  public constructor(unitOfWork: ReferralUnitOfWork) {
    super(Invite, unitOfWork);
  }

  public async getAllGroups(): Promise<string[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const ret = await transactionManager.query(`SELECT DISTINCT("groupId") FROM invites`);
    return ret.map((r: any) => r.groupId);
  }

  public async getGroupMembers(groupId: string): Promise<string[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const members = await transactionManager.query(`SELECT address FROM invites WHERE "groupId" = $1`, [groupId]);
    return members.map((row: any) => hexTransformer.from(row.address));
  }
}
