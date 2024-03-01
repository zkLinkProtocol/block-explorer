import { Entity, Column, Index, PrimaryColumn } from "typeorm";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "referrals" })
export class Referral {
  @PrimaryColumn({ generated: true, type: "bigint" })
  public readonly id: number;

  @Index()
  @Column({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Column({ type: "bytea", transformer: hexTransformer })
  public readonly referee: string;

  @Column({ type: "timestamp"})
  public readonly effectTime: string;
}
