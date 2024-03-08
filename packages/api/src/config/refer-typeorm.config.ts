import { DataSource, DataSourceOptions } from "typeorm";
import { config } from "dotenv";
import { Referral } from "src/tvl/entities/referral.entity";

config();
export const typeOrmReferModuleOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
  database: process.env.REFER_DATABASE_NAME || "referrer",
  poolSize: parseInt(process.env.DATABASE_CONNECTION_POOL_SIZE, 10) || 100,
  extra: {
    idleTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_IDLE_TIMEOUT_MS, 10) || 12000,
  },
  applicationName: "block-explorer-api",
  migrationsRun: false,
  synchronize: false,
  logging: false,
  entities: [Referral],
  subscribers: [],
  migrations: [],
};
