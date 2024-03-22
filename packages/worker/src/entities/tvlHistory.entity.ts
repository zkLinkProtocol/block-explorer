import { BigNumber } from "ethers";
import { Entity, Column, PrimaryColumn, Index, PrimaryGeneratedColumn } from "typeorm";
import { bigNumberTransformer } from "../transformers/bigNumber.transformer";
import { BaseEntity } from "./base.entity";

@Entity({ name: "tvlHistory" })
export class TVLHistory extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bigint" })
  public readonly blockNumber: number;

  @Column({ type: "varchar", length: 256, transformer: bigNumberTransformer, default: "", nullable: false })
  public readonly tvl: BigNumber;

  @Column({ type: "timestamp" })
  public readonly timestamp: Date;
}
