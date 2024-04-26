import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1714129522647 implements MigrationInterface {
    name = 'Migrations1714129522647'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tokens" ADD "reserveAmount" character varying(256) DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "reserveAmount"`);
    }

}
