import { Entity, Column, Index, PrimaryColumn } from "typeorm";
import { hexTransformer } from "src/common/transformers/hex.transformer";
import { bigIntNumberTransformer } from "src/common/transformers/bigIntNumber.transformer";
import {stringTransformer} from "src/common/transformers/string.transformer";

@Entity({ name: "pointsHistory" })
export class PointsHistory {
    @PrimaryColumn({ generated: true, type: "bigint" })
    public readonly id: number;

    @Index()
    @Column({ type: "bytea", transformer: hexTransformer })
    public readonly address: string;

    @Index()
    @Column({ type: "bigint", transformer: bigIntNumberTransformer })
    public readonly blockNumber: number;

    @Column("decimal", {scale:2} )
    public readonly stakePoint: number;

    @Column("decimal", {scale:2} )
    public readonly refPoint: number;

    @Column({ transformer: stringTransformer })
    public readonly updateType: string;
}
