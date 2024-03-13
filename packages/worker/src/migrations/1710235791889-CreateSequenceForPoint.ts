import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSequenceForPoint1710235791889 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE "pointStatisticalBlockNumber" AS BIGINT MINVALUE 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE "pointStatisticalBlockNumber"`);
  }
}
