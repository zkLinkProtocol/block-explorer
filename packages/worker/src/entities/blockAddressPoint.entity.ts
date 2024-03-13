import { Entity, Column, PrimaryColumn } from "typeorm";
import { BaseEntity } from "./base.entity";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "blockAddressPoint" })
export class BlockAddressPoint extends BaseEntity {
  @PrimaryColumn({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Column("decimal")
  public readonly depositPoint: number;

  @Column("decimal")
  public readonly tvl: number;

  @Column("decimal")
  public readonly holdBasePoint: number;

  @Column("decimal")
  public readonly holdPoint: number;

  @Column("decimal")
  public readonly refPoint: number;

  @Column("decimal")
  public readonly totalStakePoint: number;

  @Column("decimal")
  public readonly totalRefPoint: number;
}
