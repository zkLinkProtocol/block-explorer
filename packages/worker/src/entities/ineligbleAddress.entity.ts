import { Entity, Column, PrimaryColumn } from "typeorm";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "ineligibleAddresses" })
export class IneligibleAddress {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Column("varchar")
  public readonly dappName: string;
}
