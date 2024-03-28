import { BigNumber } from "ethers";
import { BaseEntity } from "src/common/entities/base.entity";
import { bigNumberTransformer } from "src/common/transformers/bigNumber.transformer";
import { Entity, Column, PrimaryColumn, Index, PrimaryGeneratedColumn } from "typeorm";

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

  @Column({ type: "int", default: '0'})
  public readonly uaw: number;
}
