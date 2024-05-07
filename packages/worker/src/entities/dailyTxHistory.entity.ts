import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";
import { BaseEntity } from "./base.entity";

@Entity({ name: "dailyTransaction" })
export class DailyTxHistory extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "int", default: '0'})
  public readonly txNum: number;

  @Index()
  @Column({ type: "timestamp" })
  public readonly timestamp: Date;

  @Column({ type: "int", default: '0'})
  public readonly exchangeNum: number;
}
