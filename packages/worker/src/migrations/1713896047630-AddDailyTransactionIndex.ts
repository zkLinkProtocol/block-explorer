import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1713896047630 implements MigrationInterface {
    name = 'Migrations1713896047630'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_8abbaf2b703d2d7805ab3afa5b" ON "dailyTransaction" ("timestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_8abbaf2b703d2d7805ab3afa5b"`);
    }

}
