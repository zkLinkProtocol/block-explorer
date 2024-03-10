import { BigNumber } from "ethers";
import { ValueTransformer } from "typeorm";

export const bigNumberTransformer: ValueTransformer = {
  to(bigNumber: BigNumber | number | null): string | null {
    if (!bigNumber && bigNumber !== 0) {
      return null;
    }
    return bigNumber.toString();
  },
  from(str: string | null): BigNumber | null {
    if (!str) {
      return BigNumber.from(0);
    }
    return BigNumber.from(str);
  },
};
