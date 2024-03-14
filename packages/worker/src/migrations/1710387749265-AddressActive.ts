import { MigrationInterface, QueryRunner } from "typeorm";

export class AddressActive1710387749265 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "addressActive" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "address" bytea NOT NULL, "blockNumber" bigint NOT NULL, PRIMARY KEY ("address"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_addressActive_blockNumber" ON "addressActive" ("blockNumber") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_addressActive_blockNumber"`);
    await queryRunner.query(`DROP TABLE "addressActive"`);
  }
}
