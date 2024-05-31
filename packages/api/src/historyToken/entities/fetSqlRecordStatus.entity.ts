import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { BigNumber } from "ethers";
import { bigNumberTransformer } from "../../common/transformers/bigNumber.transformer";

@Entity({ name: "fetSqlRecordStatus" })
@Index(["name"],{unique: true})
export class FetSqlRecordStatus extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bigint" ,default: 1})
  public readonly sourceSQLTableNumber: number;

  @Column({ type: "varchar", length: 256, transformer: bigNumberTransformer, default: "0", nullable: true })
  public readonly sourceSQLValue?: BigNumber;

  @Column()
  public readonly name: string;

}
