import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import {PriceHistory} from "./priceHistory.entity";
import { ConfigService } from "@nestjs/config";


@Injectable()
export class PriceHistoryService {
  private readonly updateTokenOffChainDataInterval: number;
  public constructor(
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,configService: ConfigService
    ) {
    this.updateTokenOffChainDataInterval =configService.get<number>("tokens.updateTokenOffChainDataInterval");
  }
  // public async foundCurPriceHistory({
  //                                     l2Address,
  //                                     dateTime,
  //                                   }: {
  //   l2Address: string;
  //   dateTime: Date;
  // }): Promise<PriceHistory[]> {
  //   const startTime = new Date(dateTime.getTime() - 5*this.updateTokenOffChainDataInterval).toTimeString();
  //   const endTime = new Date(dateTime.getTime() + 5*this.updateTokenOffChainDataInterval).toTimeString();
  //   const transactionManager = this.priceHistoryRepository
  //       .createQueryBuilder()
  //       .select()
  //       .where(`l2address = ${l2Address}`)
  //
  //   ;
  //   const res = await transactionManager.(
  //       `
  //     SELECT *
  //     FROM priceHistory
  //     WHERE
  //     AND timestamp BETWEEN $2 AND $3;
  //   `,
  //       [l2Address, startTime, endTime]
  //   );
  //   return res.rows;
  // }

  // public async foundRangePriceHistory({l2Address, dateStartTime, dateEndTime}: {
  //   l2Address: string;
  //   dateStartTime: Date;
  //   dateEndTime: Date;
  // }): Promise<PriceHistory[]> {
  //   const startTime = dateStartTime.toTimeString();
  //   const endTime = dateEndTime.toTimeString();
  //   const transactionManager = this.unitOfWork.getTransactionManager();
  //   const res = await transactionManager.query(
  //       `
  //     SELECT *
  //     FROM priceHistory
  //     WHERE l2address = $1
  //     AND timestamp BETWEEN $2 AND $3;
  //   `,
  //       [l2Address, startTime, endTime]
  //   );
  //   return res.rows;
  // }
}
