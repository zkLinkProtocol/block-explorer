import { normalizeAddressTransformer } from "src/common/transformers/normalizeAddress.transformer";
import { Entity, Column, Index, PrimaryColumn, BaseEntity } from "typeorm";

@Entity({ name: "referrers" })
export class Referral extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: normalizeAddressTransformer })
  public readonly address: string;

  @Index()
  @Column({ type: "bytea", transformer: normalizeAddressTransformer })
  public readonly referrer: string;

  @Column({ type: "bigint" })
  public readonly blockNumber?: number;
}
