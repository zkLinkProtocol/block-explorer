import { Entity, Column, Index, PrimaryColumn } from "typeorm";
import { normalizeAddressTransformer } from "src/common/transformers/normalizeAddress.transformer";
import { bigIntNumberTransformer } from "src/common/transformers/bigIntNumber.transformer";

@Entity({ name: "points" })
export class Point {
  @PrimaryColumn({ generated: true, type: "bigint" })
  public readonly id: number;

  @Index()
  @Column({ type: "bytea", transformer: normalizeAddressTransformer })
  public readonly address: string;

  @Column("decimal", { scale: 2 })
  public readonly stakePoint: number;

  @Column("decimal", { scale: 2 })
  public readonly refPoint: number;

  @Column({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly refNumber: number;
}
