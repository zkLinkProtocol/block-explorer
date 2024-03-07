import { ValueTransformer } from "typeorm";

export const decimalNumberTransformer: ValueTransformer = {
  to(number: number): number {
    return number;
  },
  from(decimal: string | null): number | null {
    if (!decimal) {
      return null;
    }
    return Number(decimal);
  },
};
