import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { stringTransformer } from "../transformers/string.transformer";
import { BigNumber } from "ethers";
import { bigNumberTransformer } from "../transformers/bigNumber.transformer";

@Entity({ name: "fetSqlRecordStatus" })
@Index(["name"],{unique: true})
export class FetSqlRecordStatus extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bigint" ,default: 1})
  public readonly sourceSQLTableNumber: number;

  @Column({ type: "varchar", length: 256, transformer: bigNumberTransformer, default: "0", nullable: true })
  public readonly sourceSQLValue?: BigNumber;

  @Column({ transformer: stringTransformer })
  public readonly name: string;

}
