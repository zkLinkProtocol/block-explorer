import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1717063460955 implements MigrationInterface {
    name = 'Migrations1717063460955'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_fc47b155cf5d42741680cf04bc"`);
        await queryRunner.query(`CREATE TABLE "fetSqlRecordStatus" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "sourceSQLTableNumber" bigint NOT NULL DEFAULT '1', "sourceSQLValue" character varying(256) DEFAULT '0', "name" character varying NOT NULL, CONSTRAINT "PK_03c5942dde9dac7c804f93973ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9dfd5b22df76ebcae26e61b715" ON "fetSqlRecordStatus" ("name") `);
        await queryRunner.query(`CREATE TABLE "withdrawalTxAmount" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "number" bigint NOT NULL, "transactionHash" bytea, "amount" character varying(128), "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_c05f122ea31879e223fa4b720cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ae72dcf4398aca62ec6027760c" ON "withdrawalTxAmount" ("timestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ae72dcf4398aca62ec6027760c"`);
        await queryRunner.query(`DROP TABLE "withdrawalTxAmount"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9dfd5b22df76ebcae26e61b715"`);
        await queryRunner.query(`DROP TABLE "fetSqlRecordStatus"`);
        await queryRunner.query(`CREATE INDEX "IDX_fc47b155cf5d42741680cf04bc" ON "balances" ("address", "tokenAddress", "balanceNum") `);
    }

}
