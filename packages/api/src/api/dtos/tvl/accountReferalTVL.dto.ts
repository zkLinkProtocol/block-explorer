import { ApiProperty } from "@nestjs/swagger";
import { ResponseBaseDto } from "../common/responseBase.dto";

export class AccountReferTVLDto {
  @ApiProperty({
    type: Number,
    description: "account tvl",
    example: "162496.33",
  })
  public readonly tvl: number;

  @ApiProperty({
    type: String,
    description: "account address",
    example: "0x433",
  })
  public readonly address: string;
}

export class AccountReferTVLResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "invited account tvl",
    type: AccountReferTVLDto,
    isArray: true,
  })
  public readonly result: AccountReferTVLDto[];
}
