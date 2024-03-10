import { ApiProperty } from "@nestjs/swagger";
import { ResponseBaseDto } from "../common/responseBase.dto";

export class TokenTVLDto {
  @ApiProperty({
    type: String,
    description: "token symbol",
    example: "arb.ETH",
  })
  public readonly symbol: string;

  @ApiProperty({
    type: String,
    description: "iconUrl",
    example: "http",
  })
  public readonly iconURL: string;

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

  @ApiProperty({
    type: String,
    description: "RWA/StableCoin/LST/LRT/NATIVE",
    example: "LST",
  })
  public readonly type: string;

  @ApiProperty({
    type: String,
    description: "Nova 1/1.5/2x/LSD/ELP",
    example: "Nova 1/1.5/2x/LSD/ELP",
  })
  public readonly yieldType: string;
}

export class TokenTVLResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "token tvl",
    type: TokenTVLDto,
    isArray: true,
  })
  public readonly result: TokenTVLDto[];
}
