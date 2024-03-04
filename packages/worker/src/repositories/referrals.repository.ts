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

  public async add(address: string,referee: string,blockNumber: number): Promise<void> {
    await this.refer.insert({
      address,referee,blockNumber,
    });
  }

  public async getReferralsByBlock(block: number,offset: bigint): Promise<Referral[]> {
    const referrals = await this.refer.query(
        `SELECT * FROM referrals WHERE blockNumber <= $1 AND id < $2 ORDER BY id DESC LIMIT 100`,[block,offset]
    );
    return referrals;
  }

  public async getReferralsByAddress(address: Buffer,block: number): Promise<Buffer[]> {
    const ret = await this.refer.query(
        `SELECT DISTINCT(referree) AS referree FROM referrals WHERE address = $1 AND blockNumber <= $1`,[address,block]
    );
    return ret.map((r:any) => r.referee);
  }

  public async getGroupMembersByAddress(address: Buffer,block:number): Promise<Buffer[]> {
      const [ret] = await this.refer.query(
          `SELECT groupId FROM referrals WHERE (address = $1 OR referee = $1) AND blockNumber <= $2`,[address,block]
      );
      const groupId = ret.groupId;
      const members = await this.refer.query(
          `SELECT DISTINCT(member) FROM (
                            SELECT address AS member FROM referrals WHERE groupId = $1 AND blockNumber <= $2
                            UNION
                            SELECT referee AS member FROM referrals WHERE groupId = $1 AND blockNumber <= $2
                        ) as members;
    `,[groupId,block]
      );
      return members.map((row:any) => row.member);

  }
}
