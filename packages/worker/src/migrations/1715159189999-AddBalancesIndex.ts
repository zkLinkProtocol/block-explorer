import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBalanceIndex1715159189999 implements MigrationInterface {
  name = "AddBalanceIndex1715159189999";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "balances" ADD "balanceNum" numeric GENERATED ALWAYS AS (balance::numeric) STORED NOT NULL`
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`,
      ["block-explorer", "public", "balances", "GENERATED_COLUMN", "balanceNum", "balance::numeric"]
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fc47b155cf5d42741680cf04bc" ON "balances" ("tokenAddress", "address", "balanceNum") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
