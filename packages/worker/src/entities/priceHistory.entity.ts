import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "priceHistory" })
export class PriceHistory extends BaseEntity {
    @PrimaryGeneratedColumn({ type: "bigint" })
    public readonly id: number;

    @Index()
    @Column({ type: "bytea", transformer: hexTransformer })
    public readonly l2Address: string;

    @Column({ type: "double precision", nullable: true })
    public readonly usdPrice?: number;

    @Index()
    @Column({ type: "timestamp" })
    public readonly timestamp: Date;
}