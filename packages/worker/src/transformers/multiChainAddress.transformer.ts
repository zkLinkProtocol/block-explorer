import {FindOperator, ValueTransformer} from "typeorm";

export const multiChainAddressTransformer: ValueTransformer = {
  from: (dbValue: Buffer) => {
    if (!dbValue) {
      return null;
    }
    if (dbValue.length === 20) { // eth
      return `0x${dbValue.toString("hex")}`;
    } else if (dbValue.length === 34) { // tron
      return dbValue.toString('utf8');
    } else {
      throw new Error(`Unsupported address format: ${dbValue}`);
    }
  },
  to: (value: string | FindOperator<any> | null) => {
    if (!value) {
      return null;
    }

    if (value instanceof FindOperator<any>) {
      return value;
    }
    if (value.startsWith('0x')) { // eth
      return Buffer.from(value.startsWith("0x") ? value.substring(2) : value, "hex");
    } else if (value.startsWith('TN')) { // tron
      return Buffer.from(value, "utf8");
    } else {
      throw new Error(`Unsupported address format: ${value}`);
    }
  }
};