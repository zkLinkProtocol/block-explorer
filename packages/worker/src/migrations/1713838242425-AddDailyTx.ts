import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1713838242425 implements MigrationInterface {
    name = 'Migrations1713838242425'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dailyTransaction" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "txNum" integer NOT NULL DEFAULT '0', "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_a2c19ac990d9bd20cc04ab25660" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "dailyTransaction"`);
    }

}
