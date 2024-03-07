import { IsNotEmpty } from "class-validator";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsSelect, MoreThanOrEqual, Brackets, In } from "typeorm";
import { Pagination } from "nestjs-typeorm-paginate";
import { AddressTokenTvl } from "./entities/addressTokenTvl.entity";
import { AccountTVLDto } from "../api/dtos/tvl/accountTVL.dto";
import { Token } from "src/token/token.entity";
import { Point } from "./entities/points.entity";
import { AddressTvl } from "./entities/addressTvl.entity";

@Injectable()
export class TVLService {
  constructor(
    @InjectRepository(AddressTokenTvl)
    private readonly addressTokenRepository: Repository<AddressTokenTvl>,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    @InjectRepository(Point)
    private readonly pointRepository: Repository<Point>,
    @InjectRepository(AddressTvl)
    private readonly addressTVLRepository: Repository<AddressTvl>
  ) {}

  public async getAccountTokensTVL(address: string): Promise<AccountTVLDto[]> {
    const tokenBalance = await this.addressTokenRepository.find({
      where: {
        address,
      },
    });

    if (tokenBalance.length === 0) {
      return [];
    }

    let tokenAddresses = tokenBalance.map((token) => token.tokenAddress);

    let tokens = await this.tokenRepository.find({
      where: {
        l2Address: In(tokenAddresses),
      },
    });

    var tokensMap = new Map(tokens.map((token) => [token.l2Address, token]));

    let result = tokenBalance.map((token) => {
      let tvl: AccountTVLDto = {
        tvl: token.tvl,
        amount: token.balance,
        tokenAddress: token.tokenAddress,
        symbol: tokensMap.get(token.tokenAddress)!.symbol,
      };
      return tvl;
    });

    return result;
  }

  public async getAccountPoints(address: string) {
    const point: Point | null = await this.pointRepository.findOne({
      where: {
        address,
      },
    });

    return point;
  }

  public async getTotalTVL() {
    const totalTVL = await this.addressTVLRepository.sum("tvl");
    return totalTVL;
  }
}
