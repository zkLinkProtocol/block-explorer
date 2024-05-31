import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1717063460955 implements MigrationInterface {
    name = 'Migrations1717063460955'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_fc47b155cf5d42741680cf04bc"`);
        await queryRunner.query(`CREATE TABLE "fetSqlRecordStatus" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "sourceSQLTableNumber" bigint NOT NULL DEFAULT '1', "sourceSQLValue" character varying(256) DEFAULT '0', "name" character varying NOT NULL, CONSTRAINT "PK_03c5942dde9dac7c804f93973ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9dfd5b22df76ebcae26e61b715" ON "fetSqlRecordStatus" ("name") `);
        await queryRunner.query(`CREATE TABLE "withdrawalTxAmount" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "number" bigint NOT NULL, "transactionHash" bytea, "amount" character varying(128), "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_c05f122ea31879e223fa4b720cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ae72dcf4398aca62ec6027760c" ON "withdrawalTxAmount" ("timestamp") `);
        await queryRunner.query(`ALTER TABLE "balances" DROP COLUMN "balanceNum"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`, ["GENERATED_COLUMN","balanceNum","blockExplorerCache","public","balances"]);
        await queryRunner.query(`ALTER TABLE "balances" ADD "balanceNum" numeric GENERATED ALWAYS AS (balance::numeric) STORED NOT NULL`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`, ["blockExplorerCache","public","balances","GENERATED_COLUMN","balanceNum","balance::numeric"]);
        await queryRunner.query(`CREATE INDEX "IDX_d15895b9f4a32c49ddf127da3f" ON "balances" ("tokenAddress", "address", "balanceNum") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d15895b9f4a32c49ddf127da3f"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`, ["GENERATED_COLUMN","balanceNum","blockExplorerCache","public","balances"]);
        await queryRunner.query(`ALTER TABLE "balances" DROP COLUMN "balanceNum"`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`, ["blockExplorerCache","public","balances","GENERATED_COLUMN","balanceNum",""]);
        await queryRunner.query(`ALTER TABLE "balances" ADD "balanceNum" numeric NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae72dcf4398aca62ec6027760c"`);
        await queryRunner.query(`DROP TABLE "withdrawalTxAmount"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9dfd5b22df76ebcae26e61b715"`);
        await queryRunner.query(`DROP TABLE "fetSqlRecordStatus"`);
        await queryRunner.query(`CREATE INDEX "IDX_fc47b155cf5d42741680cf04bc" ON "balances" ("address", "tokenAddress", "balanceNum") `);
    }

}
