import { GroupTvl } from "./../../../worker/src/entities/groupTvl.entity";
import { map } from "rxjs/operators";
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
import { TokenTVLDto } from "src/api/dtos/tvl/tokenTVL.dto";
import { Referral } from "./entities/referral.entity";
import { PagingOptionsDto } from "src/common/dtos";
import { AccountPointsDto } from "src/api/dtos/tvl/accountPoints.dto";
import { AccountReferTVLDto } from "src/api/dtos/tvl/accountReferalTVL.dto";
import { Invite } from "./entities/invite.entity";

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
    private readonly addressTVLRepository: Repository<AddressTvl>,
    @InjectRepository(Referral, "refer")
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(Invite, "refer")
    private readonly inviteRepository: Repository<Invite>,
    @InjectRepository(GroupTvl)
    private readonly groupTVLRepository: Repository<GroupTvl>
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

  public async getAccountRank(address: string): Promise<AccountRankDto> {
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

    const refereral = await this.referralRepository.findOne({
      where: {
        address,
      },
    });

    return {
      novaPoint: points ? points.stakePoint : 0,
      referPoint: points ? points.refPoint : 0,
      rank: Number(rank.count) + 1,
      inviteBy: refereral ? refereral.referrer : null,
      address,
    };
  }

  public async getAccountsRank(): Promise<AccountRankDto[]> {
    const ranks: Point[] = await this.addressTVLRepository.query(
      `select * from "points" order by "refPoint" + "stakePoint" desc limit $1`,
      [50]
    );

    if (ranks.length === 0) {
      return [];
    }

    const addresses = ranks.map((r) => normalizeAddressTransformer.from(r.address));
    const refererals = await this.referralRepository.find({
      where: {
        address: In(addresses),
      },
    });

    const referMap = new Map(refererals.map((refer) => [refer.address, refer.referrer]));

    let result: AccountRankDto[] = [];
    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i];
      const address = normalizeAddressTransformer.from(rank.address);
      const referer = referMap.get(address);
      result.push({
        novaPoint: rank.stakePoint,
        referPoint: rank.refPoint,
        rank: i + 1,
        inviteBy: referer,
        address,
      });
    }
    return result;
  }

  public async getTotalTokensTVL(): Promise<TokenTVLDto[]> {
    interface TokenTvl {
      amount: number;
      tvl: number;
      tokenAddress: string;
    }

    const totalTokens: TokenTvl[] = await this.addressTokenRepository.query(
      `SELECT sum("balance") as amount, sum("tvl") as tvl, "tokenAddress" FROM "addressTokenTvls" group by "tokenAddress"`
    );

    const tokenAddresses = totalTokens.map((token) => normalizeAddressTransformer.from(token.tokenAddress));
    let tokens = await this.tokenRepository.find({
      where: {
        l2Address: In(tokenAddresses),
      },
    });

    var tokensMap = new Map(tokens.map((token) => [token.l2Address, token]));

    let result: TokenTVLDto[] = [];
    for (let token of totalTokens) {
      const hexAddress = normalizeAddressTransformer.from(token.tokenAddress);
      result.push({
        symbol: tokensMap.get(hexAddress)!.symbol,
        tokenAddress: hexAddress,
        amount: token.amount,
        tvl: token.amount,
        type: "",
        yieldType: "",
      });
    }

    return result;
  }

  public async getReferralTvl(address: string) {
    const tvl = await this.addressTVLRepository.sum("referralTvl", { address });
    return tvl;
  }

  public async getGroupTVL(address: string) {
    let account = await this.inviteRepository.findOne({
      where: {
        address,
      },
    });

    if (!account) {
      return 0;
    }

    let groupTVL = await this.groupTVLRepository.findOne({
      where: {
        groupId: account.groupId,
      },
    });
    if (!groupTVL) {
      return 0;
    }

    return groupTVL.tvl;
  }

  public async getAccountRefferals(address: string, page: PagingOptionsDto): Promise<AccountPointsDto[]> {
    let invitees = await this.referralRepository.find({
      where: {
        referrer: address,
      },
      skip: (page.page - 1) * page.limit,
      take: page.limit,
      order: {
        createdAt: "desc",
      },
    });

    if (invitees.length === 0) {
      return [];
    }

    const addresses = invitees.map((invitee) => invitee.address);
    let points = await this.pointRepository.find({
      where: {
        address: In(addresses),
      },
    });

    const pointsMap = new Map(points.map((point) => [point.address, point]));

    let result: AccountPointsDto[] = invitees.map((invitee) => {
      const point = pointsMap.get(invitee.address);
      let account: AccountPointsDto = {
        novaPoint: point ? point.stakePoint : 0,
        referPoint: point ? point.refPoint : 0,
        address: invitee.address,
      };
      return account;
    });
    return result;
  }

  public async getAccountRefferalsTVL(address: string, page: PagingOptionsDto): Promise<AccountReferTVLDto[]> {
    let invitees = await this.referralRepository.find({
      where: {
        referrer: address,
      },
      skip: (page.page - 1) * page.limit,
      take: page.limit,
      order: {
        createdAt: "desc",
      },
    });

    if (invitees.length === 0) {
      return [];
    }

    const addresses = invitees.map((invitee) => invitee.address);
    let addressTvl = await this.addressTVLRepository.find({
      where: {
        address: In(addresses),
      },
    });

    const addressTvlMap = new Map(addressTvl.map((address) => [address.address, address]));

    let result: AccountReferTVLDto[] = invitees.map((invitee) => {
      const tvl = addressTvlMap.get(invitee.address);
      let account: AccountReferTVLDto = {
        address: invitee.address,
        tvl: tvl ? tvl.tvl : 0,
      };
      return account;
    });
    return result;
  }
}
