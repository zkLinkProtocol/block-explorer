import { ApiProperty } from "@nestjs/swagger";
import { ResponseBaseDto } from "../common/responseBase.dto";
import { AccountRankDto } from "./accountRank.dto";

export class AccountsRankResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "accounts rank",
    type: AccountRankDto,
    isArray: true,
  })
  public readonly result: AccountRankDto[];
}
