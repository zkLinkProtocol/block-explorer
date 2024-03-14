import { MigrationInterface, QueryRunner } from "typeorm";

export class BlockGroupTvl1710396974089 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "blockGroupTvl"  ("createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                                          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                                          "blockNumber" bigint NOT NULL,
                                          "groupId" varchar NOT NULL,
                                          "tvl" decimal NOT NULL,
                                          PRIMARY KEY ("blockNumber", "groupId"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "blockGroupTvl"`);
  }
}
