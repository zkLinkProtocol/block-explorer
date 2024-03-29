import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1711442817699 implements MigrationInterface {
  name = "Migrations1711442817699";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tvlHistory" ADD "uaw" integer NOT NULL DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tvlHistory" DROP COLUMN "uaw"`);
  }
}
