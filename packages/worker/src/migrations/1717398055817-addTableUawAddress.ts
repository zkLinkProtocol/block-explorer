import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1717398055817 implements MigrationInterface {
    name = 'Migrations1717398055817'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "uawAddress" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "number" bigint NOT NULL, "address" bytea NOT NULL, CONSTRAINT "PK_ca8021232bf4b7817cab8e2e012" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7198b673e200b20e8e1177029e" ON "uawAddress" ("address") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_7198b673e200b20e8e1177029e"`);
        await queryRunner.query(`DROP TABLE "uawAddress"`);
    }

}
