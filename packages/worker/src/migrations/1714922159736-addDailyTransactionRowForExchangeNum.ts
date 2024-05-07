import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1714922159736 implements MigrationInterface {
    name = 'Migrations1714922159736'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dailyTransaction" ADD "exchangeNum" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dailyTransaction" DROP COLUMN "exchangeNum"`);
    }

}
