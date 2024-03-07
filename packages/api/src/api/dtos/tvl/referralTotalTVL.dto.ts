import { ApiProperty } from "@nestjs/swagger";
import { ResponseBaseDto } from "../common/responseBase.dto";

export class ReferralTotalTVLResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "referral total tvl",
    type: Number,
  })
  public readonly result: number;
}
