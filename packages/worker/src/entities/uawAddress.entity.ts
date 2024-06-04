import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "uawAddress" })
@Index(["address"],{unique: true})
export class UawAddress extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bigint" })
  public  readonly number: number;

  @Column({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;
}
