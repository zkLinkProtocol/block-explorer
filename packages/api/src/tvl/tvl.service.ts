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
import { AccountsRankResponseDto } from "src/api/dtos/tvl/accountsRank.dto";
import { AccountRankDto } from "src/api/dtos/tvl/accountRank.dto";
import { normalizeAddressTransformer } from "src/common/transformers/normalizeAddress.transformer";

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

  public async getAccountRank(address: string): Promise<[Point | null, number]> {
    const points = await this.pointRepository.findOne({
      where: { address },
    });

    let totalPoints = 0;
    if (points) {
      totalPoints = points.refPoint + points.stakePoint;
    }

    const [rank] = await this.addressTVLRepository.query(
      `select count(1) from "points" where "refPoint" + "stakePoint" > $1`,
      [totalPoints]
    );
    return [points, Number(rank.count) + 1];
  }

  public async getAccountsRank(): Promise<AccountRankDto[]> {
    const ranks: Point[] = await this.addressTVLRepository.query(
      `select * from "points" order by "refPoint" + "stakePoint" desc limit $1`,
      [50]
    );

    let result: AccountRankDto[] = [];
    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i];
      result.push({
        novaPoint: rank.stakePoint,
        referPoint: rank.refPoint,
        rank: i + 1,
        inviteBy: "",
        address: normalizeAddressTransformer.from(rank.address),
      });
    }
    return result;
  }
}
