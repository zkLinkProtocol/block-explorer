import { ApiProperty } from "@nestjs/swagger";
import { ResponseBaseDto } from "../common/responseBase.dto";

export class AccountTVLDto {
  @ApiProperty({
    type: String,
    description: "token symbol",
    example: "arb.ETH",
  })
  public readonly symbol: string;

  @ApiProperty({
    type: String,
    description: "token address",
    example: "0x23333",
  })
  public readonly tokenAddress: string;

  @ApiProperty({
    type: Number,
    description: "token amount",
    example: "1823.567",
  })
  public readonly amount: number;

  @ApiProperty({
    type: Number,
    description: "account tvl",
    example: "162496.33",
  })
  public readonly tvl: number;
}

export class AccountTVLResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "account tvl",
    type: AccountTVLDto,
    isArray: true,
  })
  public readonly result: AccountTVLDto[];
}
