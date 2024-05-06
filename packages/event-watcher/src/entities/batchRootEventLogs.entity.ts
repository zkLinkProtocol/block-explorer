import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { hash64HexTransformer } from '../transformers/hash64Hex.transformer';
import { dateTransformer } from 'src/transformers/date.transformer';
import { bigNumberTransformer } from 'src/transformers/bigNumber.transformer';
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: 'batchRootEventLogs' })
@Index(['l1BatchNumber', 'chainId'])
@Index(["rootHash", "chainId"])
export class BatchRootEventLogs extends BaseEntity {
  @PrimaryColumn({ generated: true, type: 'bigint' })
  public readonly number: number;

  @Column({ type: 'bytea', nullable: false, transformer: hash64HexTransformer })
  public readonly transactionHash: string;

  @Column({ type: 'bytea', nullable: false, transformer: hash64HexTransformer })
  public readonly rootHash: string;

  @Column({ type: 'timestamp', nullable: true})
  public readonly executedAt?: Date;

  @Column({ type: 'bigint', transformer: bigNumberTransformer })
  public readonly l1BatchNumber: number;

  @Column({ type: 'int', nullable: true })
  public readonly chainId: number;
}
