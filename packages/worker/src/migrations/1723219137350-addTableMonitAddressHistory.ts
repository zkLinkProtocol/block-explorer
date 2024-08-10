import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1723219137350 implements MigrationInterface {
    name = 'Migrations1723219137350'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "monitAddressHistory" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "address" bytea NOT NULL, "zklAmount" character varying(256) NOT NULL DEFAULT '0', "change" character varying(256) NOT NULL DEFAULT '0', "timestamp" TIMESTAMP NOT NULL, "owner" character varying(128) NOT NULL, "vested" character varying(8) NOT NULL, "type" character varying(32) NOT NULL, "network" character varying(32) NOT NULL, CONSTRAINT "PK_db88aa85452347d1da7e727306b" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "monitAddressHistory"`);
    }

}
