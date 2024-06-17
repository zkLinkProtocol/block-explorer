import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { hexTransformer } from "../../common/transformers/hex.transformer";

@Entity({ name: "withdrawalTxAmount" })
@Index(["timestamp"])
export class WithdrawalTxAmount extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bigint" })
  public number: number;

  @Column({ type: "bytea", nullable: true, transformer: hexTransformer })
  public transactionHash?: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  public amount?: string;

  @Column({ type: "timestamp" })
  public timestamp: Date;
}
