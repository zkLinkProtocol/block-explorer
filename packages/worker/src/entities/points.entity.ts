import { Entity, Column, Index, PrimaryColumn } from "typeorm";
import { hexTransformer } from "../transformers/hex.transformer";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";

@Entity({ name: "points" })
export class Point {
  @PrimaryColumn({ generated: true, type: "bigint" })
  public readonly id: number;

  @Index()
  @Column({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Column("decimal", { scale: 2 })
  public readonly stakePoint: number;

  @Column("decimal", { scale: 2 })
  public readonly refPoint: number;

  @Column({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly refNumber: number;
}
