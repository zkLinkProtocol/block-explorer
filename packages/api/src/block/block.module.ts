import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BlockService } from "./block.service";
import { BlockController } from "./block.controller";
import { Block } from "./block.entity";
import { BlockDetails } from "./blockDetails.entity";
import { TVLHistory } from "./tvlHistory.entity";
import { PriceHistory } from "./priceHistory.entity";
import {PriceHistoryService} from "./priceHistory.service";

@Module({
  imports: [TypeOrmModule.forFeature([Block, BlockDetails, TVLHistory, PriceHistory])],
  controllers: [BlockController],
  providers: [BlockService,PriceHistoryService],
  exports: [BlockService,PriceHistoryService],
})
export class BlockModule {}
