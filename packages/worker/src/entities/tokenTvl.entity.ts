import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "tokenTvls" })
@Index(["address"])
export class TokenTvl extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Column("decimal")
  public balance: number;

  @Column("decimal")
  public tvl: number;
}
