import { Controller, Get, Param, Query, UseFilters } from "@nestjs/common";
import { ApiTags, ApiExcludeController } from "@nestjs/swagger";
import { ParseAddressPipe } from "../common/pipes/parseAddress.pipe";
import { ResponseStatus, ResponseMessage } from "../api/dtos/common/responseBase.dto";
import { ApiExceptionFilter } from "../api/exceptionFilter";
import { TokenService } from "../token/token.service";
import { TVLService } from "./tvl.service";
import { AccountTVLResponseDto } from "../api/dtos/tvl/accountTVL.dto";
import { swagger } from "src/config/featureFlags";

const entityName = "addressTokenTvl";

@ApiTags("Points")
@Controller(entityName)
@ApiExcludeController(!swagger.bffEnabled)
export class TVLController {
  constructor(private readonly tvlService: TVLService) {}

  @Get("/getAccounTvl")
  public async getAccountvl(@Query("address", new ParseAddressPipe()) address: string): Promise<AccountTVLResponseDto> {
    const tokenAccounts = await this.tvlService.getAccountTokensTVL(address);
    return {
      status: ResponseStatus.OK,
      message: ResponseMessage.OK,
      result: tokenAccounts,
    };
  }
}
