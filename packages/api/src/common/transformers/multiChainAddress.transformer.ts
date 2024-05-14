import { ValueTransformer } from "typeorm";
import { hexTransformer } from "./hex.transformer";
import { utils } from "ethers";

export const multiChainAddressTransformer: ValueTransformer = {
  from: (dbValue: Buffer) => {
    if (!dbValue) {
      return null;
    }
    if (dbValue.length === 20) { // eth
      return utils.getAddress(hexTransformer.from(dbValue));
    } else if (dbValue.length === 34) { // tron
      return dbValue.toString('utf8');
    } else {
      throw new Error(`Unsupported address format: ${dbValue}`);
    }
  },
  to: (value: string) => {
    if (value.startsWith('0x')) { // eth
      return hexTransformer.to(value);
    } else if (value.startsWith('TN')) { // tron
      return Buffer.from(value, "utf8");
    } else {
      throw new Error(`Unsupported address format: ${value}`);
    }
  }
};