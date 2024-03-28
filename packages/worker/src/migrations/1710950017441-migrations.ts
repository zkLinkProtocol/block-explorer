import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1710950017441 implements MigrationInterface {
  name = "Migrations1710950017441";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tvlHistory" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "blockNumber" bigint NOT NULL, "tvl" character varying(256) NOT NULL DEFAULT '0', "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_5992f1e95ef02c34a12c896416b" PRIMARY KEY ("id"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tvlHistory"`);
  }
}
