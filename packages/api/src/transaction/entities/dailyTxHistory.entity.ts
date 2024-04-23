import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

@Entity({ name: "dailyTransaction" })
export class DailyTxHistory extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "int", default: '0'})
  public readonly txNum: number;

  @Column({ type: "timestamp" })
  public readonly timestamp: Date;

}
