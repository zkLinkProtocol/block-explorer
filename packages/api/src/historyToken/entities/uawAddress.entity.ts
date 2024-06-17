import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { normalizeAddressTransformer } from "../../common/transformers/normalizeAddress.transformer";

@Entity({ name: "uawAddress" })
@Index(["address"],{unique: true})
export class UawAddress extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bigint" })
  public  number: number;

  @Column({ type: "bytea", transformer: normalizeAddressTransformer })
  public address: string;
}
