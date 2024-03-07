import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "src/common/entities/base.entity";
import { hexTransformer } from "src/common/transformers/hex.transformer";
import { normalizeAddressTransformer } from "src/common/transformers/normalizeAddress.transformer";

@Entity({ name: "addressTokenTvls" })
@Index(["address"])
export class AddressTokenTvl extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: normalizeAddressTransformer })
  public readonly address: string;

  @PrimaryColumn({ type: "bytea", transformer: normalizeAddressTransformer })
  public readonly tokenAddress: string;

  @Column("decimal", { scale: 6 })
  public readonly balance: number;

  @Column("decimal", { scale: 6 })
  public readonly tvl: number;
}
