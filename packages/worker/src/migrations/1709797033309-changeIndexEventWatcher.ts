import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeIndexEventWatcher1709797033309 implements MigrationInterface {
  name = "ChangeIndexEventWatcher1709797033309";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_b41b26847be744530965dbb747"`);
    await queryRunner.query(`CREATE INDEX "IDX_2a68afd22bf233fc83ec2f7af2" ON "batchRootEventLogs" ("l1BatchNumber") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_2a68afd22bf233fc83ec2f7af2"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_b41b26847be744530965dbb747" ON "batchRootEventLogs" ("l1BatchNumber", "chainId") `
    );
  }
}
