import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1715159188885 implements MigrationInterface {
    name = 'Migrations1715159188885'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tokens" ADD "isExcludeTVL" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tokens" ADD "isExternallyToken" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "isExternallyToken"`);
        await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "isExcludeTVL"`);
    }

}
