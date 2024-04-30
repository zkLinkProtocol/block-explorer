import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIneligibleAddress1714388505242 implements MigrationInterface {
  name = "AddIneligibleAddress1714388505242";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ineligibleAddresses" ("address" bytea NOT NULL, "dappName" character varying NOT NULL, CONSTRAINT "PK_974e9f649b2ff70c78dd70e5e39" PRIMARY KEY ("address"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ineligibleAddresses"`);
  }
}
