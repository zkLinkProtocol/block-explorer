
import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "monitAddressConfigList" })
@Index(["address","owner","network"],{unique: true})
export class MonitAddressConfigList extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bytea", nullable: false, transformer: hexTransformer })
  public readonly address: string;

  @Column({ type: "varchar", length: 128})
  public readonly owner: string;

  @Column({ type: "varchar", length: 8})
  public readonly vested: string;

  @Column({ type: "varchar", length: 32})
  public readonly type: string;

  @Column({ type: "varchar", length: 32})
  public readonly network: string;
}
