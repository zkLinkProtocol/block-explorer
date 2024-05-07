import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1715064911170 implements MigrationInterface {
    name = 'Migrations1715064911170'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_b41b26847be744530965dbb747"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b41b26847be744530965dbb747" ON "batchRootEventLogs" ("l1BatchNumber", "chainId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_b41b26847be744530965dbb747"`);
        await queryRunner.query(`CREATE INDEX "IDX_b41b26847be744530965dbb747" ON "batchRootEventLogs" ("l1BatchNumber", "chainId") `);
    }

}
