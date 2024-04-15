import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1712920188947 implements MigrationInterface {
    name = 'Migrations1712920188947'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "networkkey" TO "networkKey"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "networkKey" TO "networkkey"`);
    }

}
