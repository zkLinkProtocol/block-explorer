import { BigNumber } from "ethers";
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import { bigNumberTransformer } from "../transformers/bigNumber.transformer";
import { BaseEntity } from "./base.entity";

@Entity({ name: "tvlHistory" })
export class TVLHistory extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bigint" })
  public readonly blockNumber: number;

  @Column({ type: "varchar", length: 256, transformer: bigNumberTransformer, default: "0", nullable: false })
  public readonly tvl: BigNumber;

  @Column({ type: "timestamp" })
  public readonly timestamp: Date;

  @Column({ type: "int", default: "0" })
  public readonly uaw: number;
}
