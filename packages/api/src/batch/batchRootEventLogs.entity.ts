import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { dateTransformer } from "../common/transformers/date.transformer";
import { bigIntNumberTransformer } from "../common/transformers/bigIntNumber.transformer";
import { hexTransformer } from "../common/transformers/hex.transformer";
import { BaseEntity } from "../common/entities/base.entity";

@Entity({ name: "batchRootEventLogs" })
@Index(["l1BatchNumber", "chainId"],{ unique: true })
@Index(["rootHash", "chainId"])
export class BatchRootEventLogs extends BaseEntity {
  @PrimaryColumn({ generated: true, type: "bigint" })
  public readonly number: number;

  @Column({ type: "bytea", nullable: false, transformer: hexTransformer })
  public readonly transactionHash: string;

  @Column({ type: "bytea", nullable: false, transformer: hexTransformer })
  public readonly rootHash: string;

  @Column({ type: "timestamp", nullable: false, transformer: dateTransformer })
  public readonly executedAt: Date;

  @Column({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly l1BatchNumber: number;

  @Column({ type: "int", nullable: false })
  public readonly chainId: number;
}
