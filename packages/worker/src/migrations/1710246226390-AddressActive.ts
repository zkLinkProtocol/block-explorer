import { MigrationInterface, QueryRunner } from "typeorm";

export class AddressActive1710246226390 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "addressActive" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "address" bytea NOT NULL, "active" bool NOT NULL, "blockNumber" bigint NOT NULL, PRIMARY KEY ("address"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_addressActive_active" ON "addressActive" ("active") `);
    await queryRunner.query(`CREATE INDEX "IDX_addressActive_blockNumber" ON "addressActive" ("blockNumber") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_addressActive_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_addressActive_blockNumber"`);
    await queryRunner.query(`DROP TABLE "addressActive"`);
  }
}
