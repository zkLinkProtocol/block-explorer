import { BigNumber } from "ethers";
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import { bigNumberTransformer } from "../transformers/bigNumber.transformer";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "monitAddressHistory" })
export class MonitAddressHistory extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public readonly id: number;

  @Column({ type: "bytea", nullable: false, transformer: hexTransformer })
  public readonly address: string;

  @Column({ type: "varchar", length: 256, transformer: bigNumberTransformer, default: "0", nullable: false })
  public readonly zklAmount: BigNumber;

  @Column({ type: "varchar", length: 256, transformer: bigNumberTransformer, default: "0", nullable: false })
  public readonly change: BigNumber;

  @Column({ type: "timestamp" })
  public readonly timestamp: Date;

  @Column({ type: "varchar", length: 128})
  public readonly owner: string;

  @Column({ type: "varchar", length: 8})
  public readonly vested: string;

  @Column({ type: "varchar", length: 32})
  public readonly type: string;

  @Column({ type: "varchar", length: 32})
  public readonly network: string;
}
