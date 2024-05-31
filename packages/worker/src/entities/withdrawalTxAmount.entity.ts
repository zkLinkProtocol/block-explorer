import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hash64HexTransformer } from "../transformers/hash64Hex.transformer";

@Entity({ name: "withdrawalTxAmount" })
@Index(["timestamp"])
export class WithdrawalTxAmount extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bigint" })
  public  readonly number: number;

  @Column({ type: "bytea", nullable: true, transformer: hash64HexTransformer })
  public readonly transactionHash?: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  public readonly amount?: string;

  @Column({ type: "timestamp" })
  public readonly timestamp: string;
}
