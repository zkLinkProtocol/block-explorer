import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1714646609103 implements MigrationInterface {
    name = 'Migrations1714646609103'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_9e475a3d90c4eb770510437d05"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b41b26847be744530965dbb747"`);
        await queryRunner.query(`ALTER TABLE "dailyTransaction" ADD "exchangeNum" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9e475a3d90c4eb770510437d05" ON "batchRootEventLogs" ("rootHash", "chainId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_9e475a3d90c4eb770510437d05"`);
        await queryRunner.query(`ALTER TABLE "dailyTransaction" DROP COLUMN "exchangeNum"`);
        await queryRunner.query(`CREATE INDEX "IDX_b41b26847be744530965dbb747" ON "batchRootEventLogs" ("l1BatchNumber", "chainId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9e475a3d90c4eb770510437d05" ON "batchRootEventLogs" ("rootHash", "chainId") `);
    }

}
