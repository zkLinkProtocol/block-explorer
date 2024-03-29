import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTotalSupplyTokens1709913479408 implements MigrationInterface {
  name = "AddTotalSupplyTokens1709913479408";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tokens" ADD "totalSupply" character varying(256) DEFAULT ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "totalSupply"`);
  }
}
