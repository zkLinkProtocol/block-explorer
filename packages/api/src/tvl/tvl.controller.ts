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
}
