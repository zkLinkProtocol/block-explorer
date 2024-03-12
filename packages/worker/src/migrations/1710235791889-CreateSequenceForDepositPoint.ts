import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSequenceForDepositPoint1710235791889 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE "depositPoint_statisticalBlockNumber" AS BIGINT MINVALUE -1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE "depositPoint_statisticalBlockNumber"`);
  }
}
