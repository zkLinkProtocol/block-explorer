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

  public async add(address: string,referee: string,effectTime: string): Promise<void> {
    await this.refer.insert({
      address,referee,effectTime,
    });
  }

  public async getReferrals(): Promise<Referral[]> {
    const referrals = await this.refer.query(
        `SELECT * FROM referrals ORDER BY id DESC`,[]
    );
    return referrals;
  }

  public async getReferralsByBlock(block: number,offset: bigint): Promise<Referral[]> {
    const referrals = await this.refer.query(
        `SELECT * FROM referrals WHERE blockNumber <= $1 AND id < $2 ORDER BY id DESC LIMIT 100`,[block,offset]
    );
    return referrals;
  }
}
