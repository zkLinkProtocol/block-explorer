import { Entity, Column, PrimaryColumn } from "typeorm";
import {normalizeAddressTransformer} from "../../common/transformers/normalizeAddress.transformer";

@Entity({ name: "ineligibleAddresses" })
export class IneligibleAddress {
  @PrimaryColumn({ type: "bytea", transformer: normalizeAddressTransformer })
  public readonly address: string;

  @Column("varchar")
  public readonly dappName: string;
}
