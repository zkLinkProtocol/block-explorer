import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import {BaseEntity} from "../../common/entities/base.entity";
import {normalizeAddressTransformer} from "../../common/transformers/normalizeAddress.transformer";

@Entity({ name: "tokenTvls" })
@Index(["address"])
export class TokenTvl extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: normalizeAddressTransformer })
  public readonly address: string;

  @Column("decimal")
  public balance: number;

  @Column("decimal")
  public tvl: number;
}
