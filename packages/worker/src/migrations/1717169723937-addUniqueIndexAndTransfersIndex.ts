import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1717169723937 implements MigrationInterface {
    name = 'Migrations1717169723937'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_9dfd5b22df76ebcae26e61b715"`);
        await queryRunner.query(`CREATE INDEX "IDX_71cc4efb32570e58b06b6e49b7" ON "transfers" ("type", "number", "tokenAddress") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9dfd5b22df76ebcae26e61b715" ON "fetSqlRecordStatus" ("name") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_9dfd5b22df76ebcae26e61b715"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71cc4efb32570e58b06b6e49b7"`);
        await queryRunner.query(`CREATE INDEX "IDX_9dfd5b22df76ebcae26e61b715" ON "fetSqlRecordStatus" ("name") `);
    }

}
