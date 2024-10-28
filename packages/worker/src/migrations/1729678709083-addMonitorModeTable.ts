import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1729678709083 implements MigrationInterface {
    name = 'Migrations1729678709083'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "monitAddressConfigList" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "address" bytea NOT NULL, "owner" character varying(128) NOT NULL, "vested" character varying(8) NOT NULL, "type" character varying(32) NOT NULL, "network" character varying(32) NOT NULL, CONSTRAINT "PK_91e530f9ed96411aa22665aae31" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c57397aa345b67f8e263839513" ON "monitAddressConfigList" ("address", "owner", "network") `);
        await queryRunner.query(`CREATE TABLE "monitAddressLast" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "address" bytea NOT NULL, "zklAmount" character varying(256) NOT NULL DEFAULT '0', "change" character varying(256) NOT NULL DEFAULT '0', "timestamp" TIMESTAMP NOT NULL, "owner" character varying(128) NOT NULL, "vested" character varying(8) NOT NULL, "type" character varying(32) NOT NULL, "network" character varying(32) NOT NULL, CONSTRAINT "PK_7c8d0ac07e965f53edcc7a10ed3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "monitAddressUserList" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "address" bytea NOT NULL, "owner" character varying(128) NOT NULL, "vested" character varying(8) NOT NULL, "type" character varying(32) NOT NULL, "network" character varying(32) NOT NULL, CONSTRAINT "PK_356890deb9db586dad53fe650aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "monitorChainRecord" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" BIGSERIAL NOT NULL, "chainNumber" bigint NOT NULL DEFAULT '1', "name" character varying NOT NULL, CONSTRAINT "PK_31ebceb4b3f2d6ce1449cc0a30d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_38a9fbd98d281c128af6480d02" ON "monitorChainRecord" ("name") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_38a9fbd98d281c128af6480d02"`);
        await queryRunner.query(`DROP TABLE "monitorChainRecord"`);
        await queryRunner.query(`DROP TABLE "monitAddressUserList"`);
        await queryRunner.query(`DROP TABLE "monitAddressLast"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c57397aa345b67f8e263839513"`);
        await queryRunner.query(`DROP TABLE "monitAddressConfigList"`);
    }

}
