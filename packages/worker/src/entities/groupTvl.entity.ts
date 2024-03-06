import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "groupTvls" })
@Index(["groupId"])
export class GroupTvl extends BaseEntity {
    @PrimaryColumn()
    public readonly groupId: number;

    @Column("decimal", {scale:6} )
    public readonly tvl: number;
}
