import { ValueTransformer } from "typeorm";

export const dateTransformer: ValueTransformer = {
  to(date: Date): string {
    return date.toISOString();
  },
  from(dateString: string): Date {
    return new Date(dateString);
  },
};
