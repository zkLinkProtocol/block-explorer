import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LogModule } from "../log/log.module";
import { AddressTokenTvl } from "./entities/addressTokenTvl.entity";
import { TVLService } from "./tvl.service";
import { Token } from "src/token/token.entity";
import { TVLController } from "./tvl.controller";
import { Point } from "./entities/points.entity";
import { AddressTvl } from "./entities/addressTvl.entity";
import { Referral } from "./entities/referral.entity";
import { typeOrmReferModuleOptions } from "src/config/refer-typeorm.config";
import { Repository } from "typeorm";

@Module({
  imports: [
    TypeOrmModule.forFeature([AddressTokenTvl, Token, Point, AddressTvl]),
    TypeOrmModule.forFeature([Referral], "refer"),
    LogModule,
  ],

  exports: [TVLService],
  providers: [TVLService],
  controllers: [TVLController],
})
export class TVLModule {}
