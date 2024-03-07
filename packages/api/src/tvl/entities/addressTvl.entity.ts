import { BaseEntity } from "src/common/entities/base.entity";
import { normalizeAddressTransformer } from "src/common/transformers/normalizeAddress.transformer";
import { Entity, Column, PrimaryColumn, Index } from "typeorm";

@Entity({ name: "addressTvls" })
@Index(["address"])
export class AddressTvl extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: normalizeAddressTransformer })
  public readonly address: string;

  @Column("decimal", { scale: 6 })
  public readonly tvl: number;

  @Column("decimal", { scale: 6 })
  public readonly referralTvl: number;
}
