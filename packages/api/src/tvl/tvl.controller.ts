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
import { AccountPointsResponseDto } from "src/api/dtos/tvl/accountPoints.dto";
import { TotalTVLResponseDto } from "src/api/dtos/tvl/totalTVL.dto";
import { AccountRankResponseDto } from "src/api/dtos/tvl/accountRank.dto";
import { AccountsRankResponseDto } from "src/api/dtos/tvl/accountsRank.dto";
import { TokenTVLResponseDto } from "src/api/dtos/tvl/tokenTVL.dto";
import { ReferralTotalTVLResponseDto } from "src/api/dtos/tvl/referralTotalTVL.dto";

const entityName = "addressTokenTvl";

@ApiTags("Points")
@Controller(entityName)
@ApiExcludeController(!swagger.bffEnabled)
export class TVLController {
  constructor(private readonly tvlService: TVLService) {}

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
  ): Promise<AccountPointsResponseDto> {
    const point = await this.tvlService.getAccountPoints(address);
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result: {
        novaPoint: point ? point.stakePoint : 0,
        referPoint: point ? point.refPoint : 0,
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
    const [points, rank] = await this.tvlService.getAccountRank(address);
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result: {
        novaPoint: points ? points.stakePoint : 0,
        referPoint: points ? points.refPoint : 0,
        rank,
        inviteBy: "",
        address,
      },
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
}
