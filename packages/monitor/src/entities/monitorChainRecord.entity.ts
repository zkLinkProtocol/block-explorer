import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { stringTransformer } from "../transformers/string.transformer";

@Entity({ name: "monitorChainRecord" })
@Index(["name"],{unique: true})
export class MonitorChainRecord extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bigint" ,default: 1})
  public readonly chainNumber: number;

  @Column({ transformer: stringTransformer })
  public readonly name: string;

}
