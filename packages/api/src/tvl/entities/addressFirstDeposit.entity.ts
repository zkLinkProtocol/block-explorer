import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import {normalizeAddressTransformer} from "../../common/transformers/normalizeAddress.transformer";

@Entity({ name: "addressFirstDeposits" })
@Index(["address"])
export class AddressFirstDeposit {
    @PrimaryColumn({ type: "bytea", transformer: normalizeAddressTransformer })
    public readonly address: string;

    @Column({ type: "timestamp" })
    public readonly firstDepositTime: Date;
}
