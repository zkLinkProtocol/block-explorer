import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEventWatcher1709791622965 implements MigrationInterface {
    name = 'AddEventWatcher1709791622965'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "batchRootEventLogs" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "number" BIGSERIAL NOT NULL, "transactionHash" bytea NOT NULL, "rootHash" bytea NOT NULL, "executedAt" TIMESTAMP, "l1BatchNumber" bigint NOT NULL, "chainId" integer, CONSTRAINT "PK_92656647d06f2766fda258138e4" PRIMARY KEY ("number"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9e475a3d90c4eb770510437d05" ON "batchRootEventLogs" ("rootHash", "chainId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b41b26847be744530965dbb747" ON "batchRootEventLogs" ("l1BatchNumber", "chainId") `);
        await queryRunner.query(`CREATE TABLE "eventProcess" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "number" BIGSERIAL NOT NULL, "topic" bytea NOT NULL, "chainId" integer NOT NULL, "contractAddress" bytea NOT NULL, "processedBlockNumber" bigint NOT NULL, CONSTRAINT "PK_cdc166d653ea24cc45a0b6bc5b1" PRIMARY KEY ("number"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_11d1f42e3b67f849213d2ce7bf" ON "eventProcess" ("topic", "chainId", "contractAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_d5f27ed1ed261256abb7cad08d" ON "eventProcess" ("processedBlockNumber", "chainId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d5f27ed1ed261256abb7cad08d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_11d1f42e3b67f849213d2ce7bf"`);
        await queryRunner.query(`DROP TABLE "eventProcess"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b41b26847be744530965dbb747"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9e475a3d90c4eb770510437d05"`);
        await queryRunner.query(`DROP TABLE "batchRootEventLogs"`);
    }

}
