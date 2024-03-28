import { ValueTransformer } from "typeorm";
import { hexTransformer } from "./hex.transformer";
export const ZERO_HASH_64 = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const hash64HexTransformer: ValueTransformer = {
  to(str: string | null): Buffer | null {
    if (str === ZERO_HASH_64) {
      return null;
    }
    return hexTransformer.to(str);
  },
  from(hex: Buffer): string {
    return hexTransformer.from(hex);
  },
};
