import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlockScanRange1709001391237 implements MigrationInterface {
  name = "AddBlockScanRange1709001391237";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "blockScanRange" ("id" BIGSERIAL NOT NULL, "from" bigint NOT NULL, "to" bigint NOT NULL, CONSTRAINT "PK_dc69d8f9251ba6eb702ca645330" PRIMARY KEY ("id"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "blockScanRange"`);
  }
}
