import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOkResponse, ApiExcludeController } from "@nestjs/swagger";
import { Not, IsNull } from "typeorm";
import { BatchService } from "../batch/batch.service";
import { BlockService } from "../block/block.service";
import { TransactionService } from "../transaction/transaction.service";
import { StatsDto } from "./stats.dto";
import { swagger } from "../config/featureFlags";
import {LRUCache} from "lru-cache";

const entityName = "stats";

const options = {
    // how long to live in ms
    ttl: 1000 * 60,
    // return stale items before removing from cache?
    allowStale: false,
    ttlAutopurge: true,
};

const cache = new LRUCache(options);

@ApiTags("Stats BFF")
@ApiExcludeController(!swagger.bffEnabled)
@Controller(entityName)
export class StatsController {
  constructor(
    private readonly batchService: BatchService,
    private readonly blocksService: BlockService,
    private readonly transactionService: TransactionService
  ) {}

  @Get()
  @ApiOkResponse({ description: "Blockchain stats", type: StatsDto })
  public async stats(): Promise<StatsDto> {
      const total = cache.get("totalVerifiedBlockNumber");
      let totalVerifiedBlockNumber: number = 0;
      if(total) {
         totalVerifiedBlockNumber = total as number;
      }else {
          totalVerifiedBlockNumber = await this.blocksService.getLastVerifiedBlockNumber();
          cache.set("totalVerifiedBlockNumber",totalVerifiedBlockNumber);
      }
    const [lastSealedBatch, lastVerifiedBatch, lastSealedBlock, lastVerifiedBlock, totalTransactions] =
      await Promise.all([
        this.batchService.getLastBatchNumber(),
        this.batchService.getLastBatchNumber({ executedAt: Not(IsNull()) }),
        this.blocksService.getLastBlockNumber(),
        totalVerifiedBlockNumber,
        this.transactionService.count(),
      ]);

    return {
      lastSealedBatch,
      lastVerifiedBatch,
      lastSealedBlock,
      lastVerifiedBlock,
      totalTransactions,
    };
  }
}
