import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1711530636840 implements MigrationInterface {
    name = 'Migrations1711530636840'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "priceHistory" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "l2Address" bytea NOT NULL, "usdPrice" double precision, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_cefd61c8c95eb4b9c8e11ed352f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3238d1120335bb60b1991b182b" ON "priceHistory" ("l2Address") `);
        await queryRunner.query(`CREATE INDEX "IDX_e75fcfa392e14e99420a40fd25" ON "priceHistory" ("timestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e75fcfa392e14e99420a40fd25"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3238d1120335bb60b1991b182b"`);
        await queryRunner.query(`DROP TABLE "priceHistory"`);
    }

}
