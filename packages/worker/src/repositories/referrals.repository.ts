import { Injectable } from "@nestjs/common";
import {FindOptionsWhere, FindOptionsSelect, FindOptionsRelations, Repository} from "typeorm";
import { UnitOfWork } from "../unitOfWork";
import {Point} from "../entities";
import {Referral} from "../entities/referral.entity";
import {selectBalancesScript} from "./balance.repository";
import {InjectRepository} from "@nestjs/typeorm";

@Injectable()
export class ReferralsRepository {

  public constructor(
      @InjectRepository(Referral, "refer")
      private readonly refer: Repository<Referral>) {}

  public async add(referrer: string,address: string,blockNumber: number): Promise<void> {
    await this.refer.insert({
        referrer,address,blockNumber,
    });
  }

  public async getReferralsByBlock(block: number,offset: bigint): Promise<Referral[]> {
    const referrals = await this.refer.query(
        `SELECT * FROM referrers WHERE "blockNumber" <= $1 AND id < $2 ORDER BY id DESC LIMIT 100`,[block,offset]
    );
    return referrals;
  }

    public async updateReferralsBlock(referee: string,block: number): Promise<void> {
        await this.refer.query(
            `UPDATE referrers SET "blockNumber" = $2 WHERE address = $1 AND "blockNumber" IS NULL`,[referee,block]
        );
    }

    public async updateActives(addresses: Buffer[]): Promise<void> {
      for (const address of addresses) {
          await this.refer.query(
              `UPDATE invites
               SET "active" = true
               WHERE address = $1`, [address]
          );
      }
    }

  public async getReferralsByAddress(referer: Buffer,block: number): Promise<Buffer[]> {
    const ret = await this.refer.query(
        `SELECT DISTINCT(address) AS referee FROM referrers WHERE referrer = $1 AND "blockNumber" <= $2`,[referer,block]
    );
    return ret.map((r:any) => r.referee);
  }

  public async getGroupMembersByAddress(address: Buffer,block:number): Promise<Buffer[]> {
      const [ret] = await this.refer.query(
          `SELECT "groupId" FROM invites WHERE address = $1 AND "blockNumber" <= $2`,[address,block]
      );
      if (!ret) {
        return [];
      }
      const groupId = ret.groupId;
      const members = await this.refer.query(
          `SELECT DISTINCT(address) FROM invites WHERE "groupId" = $1 AND "blockNumber" <= $2`,[groupId,block]
      );
      return members.map((row:any) => row.address);

  }

    public async getAllGroups(): Promise<string[]> {
        const ret = await this.refer.query(
            `SELECT DISTINCT("groupId") FROM invites`,
        );
        return ret.map((r:any) => r.groupId);
    }

    public async getGroupMembers(groupId: string): Promise<Buffer[]> {
        const members = await this.refer.query(
            `SELECT address FROM invites WHERE "groupId" = $1`,[groupId]
        );
        return members.map((row:any) => row.address);

    }
}
