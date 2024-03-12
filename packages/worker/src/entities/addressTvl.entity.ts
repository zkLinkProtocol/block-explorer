import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "addressTvls" })
@Index(["address"])
export class AddressTvl extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Column("decimal", { scale: 6 })
  public readonly tvl: number;

  @Column("decimal", { scale: 6 })
  public readonly referralTvl: number;
}
