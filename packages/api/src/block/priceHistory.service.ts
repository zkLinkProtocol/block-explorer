import {Injectable} from "@nestjs/common";
import {Repository} from "typeorm";
import {InjectRepository} from "@nestjs/typeorm";
import {PriceHistory} from "./priceHistory.entity";
import {ApiProperty} from "@nestjs/swagger";


@Injectable()
export class PriceHistoryService {
  private readonly updateTokenOffChainDataInterval: number;
  public constructor(
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    ) {
    this.updateTokenOffChainDataInterval = 10;
  }
  public async foundCurTimePriceHistory({
                                      l2Address,
                                      dateTime,
                                    }: {
    l2Address: string;
    dateTime: Date;
  }): Promise<PriceHistory> {
    const startTime = new Date(dateTime.getTime() - this.updateTokenOffChainDataInterval*60*60*1000);
    const endTime = new Date(dateTime.getTime() + this.updateTokenOffChainDataInterval*60*60*1000);
    const res = await this.priceHistoryRepository.query(
        `SELECT * FROM public."priceHistory" where "priceHistory"."l2Address" = $1 and timestamp BETWEEN $2 and $3 `,
        [l2Address, startTime, endTime]
    );
    return this.findClosest(res, dateTime);
  }

  public async findClosest(priceHistoryList: PriceHistory[], curTime: Date): Promise<PriceHistory> {
    let low = 0;
    let high = priceHistoryList.length - 1;

    while (low < high) {
      let mid = Math.floor((low + high) / 2);

      if (priceHistoryList[mid].timestamp === curTime) {
        return priceHistoryList[mid];
      }

      if (curTime < priceHistoryList[mid].timestamp) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    // when low === high , mean its list not have time === curTimeTime , we can see the closet time in list to return , prfer new time 
    if (low === high && priceHistoryList[low - 1] !== undefined && priceHistoryList[low - 1] !== null){
      if ( curTime.getTime() - priceHistoryList[low - 1].timestamp.getTime() < priceHistoryList[low].timestamp.getTime() - curTime.getTime() ){
        return priceHistoryList[low - 1];
      }
    }
    return priceHistoryList[low];
  }

  public async foundRangePriceHistory({l2Address, dateStartTime, dateEndTime}: {
    l2Address: string;
    dateStartTime: Date;
    dateEndTime: Date;
  }): Promise<PriceHistory[]> {
    return await this.priceHistoryRepository.query(
        `SELECT * FROM public."priceHistory" where "priceHistory"."l2Address" = $1 and timestamp BETWEEN $2 and $3 `,
        [l2Address, dateStartTime, dateEndTime]
    );
  }
}

export class ExceptionResponse {
  @ApiProperty({
    type: Number,
    description: 'error code',
    example: 0,
  })
  public readonly errno: number;
  //errmsg
  @ApiProperty({
    type: String,
    description: 'error message',
    example: 'no error',
  })
  public readonly errmsg: string;
}

export const NOT_FOUND_EXCEPTION: ExceptionResponse = {
  errmsg: 'not found',
  errno: 1,
};
