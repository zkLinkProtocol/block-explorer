import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1729769205002 implements MigrationInterface {
    name = 'Migrations1729769205002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "monitAddressUserList" ADD "zklAmount" character varying(256) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_99d081ba0ac356021aadddac7f" ON "monitAddressUserList" ("address", "owner", "network") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_99d081ba0ac356021aadddac7f"`);
        await queryRunner.query(`ALTER TABLE "monitAddressUserList" DROP COLUMN "zklAmount"`);
    }

}
