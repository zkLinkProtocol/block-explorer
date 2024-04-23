import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTokensTvl1713785820965 implements MigrationInterface {
  name = "AddTokensTvl1713785820965";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tokenTvls" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(),"updatedAt" TIMESTAMP NOT NULL DEFAULT now(),"address"   bytea     NOT NULL,"balance"   numeric   NOT NULL,"tvl"       numeric   NOT NULL,CONSTRAINT "PK_5325caca28f14a3423f4c335ac8" PRIMARY KEY ("address"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_5325caca28f14a3423f4c335ac" ON "tokenTvls" ("address") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_5325caca28f14a3423f4c335ac"`);
    await queryRunner.query(`DROP TABLE "tokenTvls"`);
  }
}
