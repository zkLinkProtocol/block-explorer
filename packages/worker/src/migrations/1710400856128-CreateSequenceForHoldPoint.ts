import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSequenceForHoldPoint1710400856128 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE "holdPointStatisticalBlockNumber" AS BIGINT MINVALUE 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE "holdPointStatisticalBlockNumber"`);
  }
}
