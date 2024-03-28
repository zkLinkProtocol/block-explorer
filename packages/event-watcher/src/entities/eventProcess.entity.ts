import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";
import { hash64HexTransformer } from "../transformers/hash64Hex.transformer";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "eventProcess" })
@Index(["processedBlockNumber", "chainId"])
@Index(["topic", "chainId", "contractAddress"], { unique: true })
export class EventProcess extends BaseEntity {
  @PrimaryColumn({ generated: true, type: "bigint" })
  public readonly number: number;

  @Column({ type: "bytea", nullable: false, transformer: hash64HexTransformer })
  public readonly topic: string;

  @Column({ type: "int", nullable: false })
  public readonly chainId: number;

  @Column({ type: "bytea", nullable: false, transformer: hexTransformer })
  public readonly contractAddress: string;

  @Column({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly processedBlockNumber: number;
}
