import { BaseEntity } from "src/common/entities/base.entity";
import { bigIntNumberTransformer } from "src/common/transformers/bigIntNumber.transformer";
import { normalizeAddressTransformer } from "src/common/transformers/normalizeAddress.transformer";
import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "invites" })
export class Invite extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: normalizeAddressTransformer })
  public readonly address: string;

  @Column({ type: "varchar", readonly: true })
  public readonly twitterName: string;

  @Column({ type: "varchar", unique: true, readonly: true })
  public readonly twitterHandler: string;

  @Column({ type: "varchar", length: 6, unique: true, readonly: true })
  public readonly code: string;

  @Column({ type: "varchar", readonly: true })
  public readonly groupId: string;

  @Column({ type: "boolean", default: false })
  public readonly active: boolean;

  @Column({
    type: "bigint",
    transformer: bigIntNumberTransformer,
  })
  public readonly blockNumber: number;
}
