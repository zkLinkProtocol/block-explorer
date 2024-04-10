import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BlockService } from "../block/block.service";
import { BlockController } from "./block.controller";
import { Block } from "./block.entity";
import { BlockDetails } from "./blockDetails.entity";
import { TVLHistory } from "./tvlHistory.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Block, BlockDetails, TVLHistory])],
  controllers: [BlockController],
  providers: [BlockService],
  exports: [BlockService],
})
export class BlockModule {}
