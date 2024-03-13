import { MigrationInterface, QueryRunner } from "typeorm";

export class BlockAddressPoint1710322944792 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "blockAddressPoint" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                                             "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                                             "blockNumber" bigint NOT NULL, 
                                             "address" bytea NOT NULL, 
                                             "depositPoint" decimal NOT NULL, 
                                             "holdPoint" decimal NOT NULL, 
                                             "refPoint" decimal NOT NULL, 
                                             "totalStakePoint" decimal NOT NULL, 
                                             "totalRefPoint" decimal NOT NULL, 
                                             PRIMARY KEY ("blockNumber", "address"))`
    );
    await queryRunner.query(`CREATE SEQUENCE "pointParsedTransferId" AS BIGINT MINVALUE -1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE "pointParsedTransferId"`);
  }
}
