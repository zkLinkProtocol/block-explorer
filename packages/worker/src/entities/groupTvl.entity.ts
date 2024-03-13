import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";

@Entity({ name: "groupTvls" })
@Index(["groupId"])
export class GroupTvl extends BaseEntity {
  @PrimaryColumn({ type: "varchar" })
  public readonly groupId: string;

  @Column("decimal", { scale: 6 })
  public readonly tvl: number;
}
