import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1712584234432 implements MigrationInterface {
    name = 'Migrations1712584234432'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" ADD "networkkey" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "networkkey"`);
    }

}
