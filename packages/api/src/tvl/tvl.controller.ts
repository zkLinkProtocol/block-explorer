import { Controller, Get, Param, Query, UseFilters } from "@nestjs/common";
import { ApiTags, ApiExcludeController, ApiOperation } from "@nestjs/swagger";
import { ParseAddressPipe } from "../common/pipes/parseAddress.pipe";
import { ResponseStatus, ResponseMessage } from "../api/dtos/common/responseBase.dto";
import { ApiExceptionFilter } from "../api/exceptionFilter";
import { TokenService } from "../token/token.service";
import { TVLService } from "./tvl.service";
import { AccountTVLResponseDto } from "../api/dtos/tvl/accountTVL.dto";
import { swagger } from "src/config/featureFlags";
import { Point } from "./entities/points.entity";
import { AccountPointResponseDto, AccountPointsResponseDto } from "src/api/dtos/tvl/accountPoints.dto";
import { TotalTVLResponseDto } from "src/api/dtos/tvl/totalTVL.dto";
import { AccountRankResponseDto } from "src/api/dtos/tvl/accountRank.dto";
import { AccountsRankResponseDto } from "src/api/dtos/tvl/accountsRank.dto";
import { TokenTVLResponseDto } from "src/api/dtos/tvl/tokenTVL.dto";
import { ReferralTotalTVLResponseDto } from "src/api/dtos/tvl/referralTotalTVL.dto";
import { PagingOptionsDto } from "src/common/dtos";
import { AccountReferTVLResponseDto } from "src/api/dtos/tvl/accountReferalTVL.dto";
import {ConfigService} from "@nestjs/config";
import {DepositThresholdDto} from "../api/dtos/stats/depositThreshold.dto";

const entityName = "addressTokenTvl";

@ApiTags("Points")
@Controller(entityName)
@ApiExcludeController(!swagger.bffEnabled)
export class TVLController {
  private readonly pointsPhase1StartTime: string;
  private readonly  pointsEarlyDepositEndTime: string;
  private readonly  pointsPhase1EndTime: string;
  constructor(
      private readonly tvlService: TVLService,
      configService: ConfigService
  ) {
    this.pointsPhase1StartTime = configService.get<string>("pointsPhase1StartTime");
    this.pointsPhase1EndTime = configService.get<string>("pointsPhase1EndTime");
    this.pointsEarlyDepositEndTime = configService.get<string>("pointsEarlyDepositEndTime");
  }

  @Get("/getDepositEthThreshold")
  public async getDepositEthThreshold(): Promise<DepositThresholdDto> {
    let nowDate = new Date();
    let threshold = 0;
    if (nowDate >= new Date(this.pointsPhase1StartTime) && nowDate <= new Date(this.pointsPhase1EndTime)) {
      if (nowDate <= new Date(this.pointsEarlyDepositEndTime)) {
        threshold = 0.1;
      } else {
        threshold = 0.25;
      }
    }
    return { ethAmount: threshold}
  }

  @ApiOperation({ summary: "Get account TVL" })
  @Get("/getAccounTvl")
  public async getAccountvl(@Query("address", new ParseAddressPipe()) address: string): Promise<AccountTVLResponseDto> {
    const tokenAccounts = await this.tvlService.getAccountTokensTVL(address);
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result: tokenAccounts,
    };
  }


  @ApiOperation({ summary: "Get account point" })
  @Get("/getAccountPoint")
  public async getAccountPoint(
    @Query("address", new ParseAddressPipe()) address: string
  ): Promise<AccountPointResponseDto> {
    const point = await this.tvlService.getAccountPoints(address);
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result: {
        novaPoint: point ? point.stakePoint : 0,
        referPoint: point ? point.refPoint : 0,
        address,
      },
    };
  }

  @ApiOperation({ summary: "Get total tvl" })
  @Get("/getTotalTvl")
  public async getTotalTVL(): Promise<TotalTVLResponseDto> {
    const totalTvl = await this.tvlService.getTotalTVL();
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result: totalTvl,
    };
  }

  @ApiOperation({ summary: "Get account rank" })
  @Get("/getAccountRank")
  public async getAccountRank(
    @Query("address", new ParseAddressPipe()) address: string
  ): Promise<AccountRankResponseDto> {
    const result = await this.tvlService.getAccountRank(address);
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result,
    };
  }

  @ApiOperation({ summary: "Get accounts rank" })
  @Get("/getAccountsRank")
  public async getAccountsRank(): Promise<AccountsRankResponseDto> {
    const result = await this.tvlService.getAccountsRank();
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result,
    };
  }

  @ApiOperation({ summary: "total token tvl" })
  @Get("/getTotalTvlByToken")
  public async getTotalTvlByToken(): Promise<TokenTVLResponseDto> {
    const result = await this.tvlService.getTotalTokensTVL();
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result,
    };
  }

  @ApiOperation({ summary: "referral tvl" })
  @Get("/getReferralTvl")
  public async getReferralTvl(
    @Query("address", new ParseAddressPipe()) address: string
  ): Promise<ReferralTotalTVLResponseDto> {
    const result = await this.tvlService.getReferralTvl(address);
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result,
    };
  }

  @ApiOperation({ summary: "group tvl" })
  @Get("/getGroupTvl")
  public async getGroupTvl(
    @Query("address", new ParseAddressPipe()) address: string
  ): Promise<ReferralTotalTVLResponseDto> {
    const result = await this.tvlService.getReferralTvl(address);
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result: 23,
    };
  }

  @ApiOperation({ summary: "getAccount Refferals point" })
  @Get("/getAccountRefferals")
  public async getAccountRefferals(
    @Query("address", new ParseAddressPipe()) address: string,
    @Query() pagingOptions: PagingOptionsDto
  ): Promise<AccountPointsResponseDto> {
    const result = await this.tvlService.getAccountRefferals(address, pagingOptions);
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result,
    };
  }

  @ApiOperation({ summary: "getAccount Refferals tvl" })
  @Get("/getAccountRefferalsTVL")
  public async getAccountRefferalsTVL(
    @Query("address", new ParseAddressPipe()) address: string,
    @Query() pagingOptions: PagingOptionsDto
  ): Promise<AccountReferTVLResponseDto> {
    const result = await this.tvlService.getAccountRefferalsTVL(address, pagingOptions);
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result,
    };
  }
}
