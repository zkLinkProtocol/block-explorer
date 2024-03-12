import { ApiProperty } from "@nestjs/swagger";

export class TokenAddressDto {
  @ApiProperty({ type: String, description: "chain name", example: "Ethereum" })
  public readonly chain: string;

  @ApiProperty({
    type: String,
    description: "L1 token address",
    example: "0xd754Ff5e8a6f257E162F72578A4bB0493c0681d8",
  })
  public readonly l1Address: string;

  @ApiProperty({
    type: String,
    description: "L2 token address",
    example: "0xd754Ff5e8a6f257E162F72578A4bB0493c0681d8",
  })
  public readonly l2Address: string;
}

export class SupportTokenDto {
  @ApiProperty({
    type: TokenAddressDto,
    description: "Token address",
    isArray: true,
  })
  public readonly address: TokenAddressDto[];

  @ApiProperty({
    type: String,
    description: "Token symbol",
    example: "ABCD",
  })
  public readonly symbol: string;

  @ApiProperty({ type: Number, description: "Token decimals value", example: 18 })
  public readonly decimals: number;

  @ApiProperty({
    type: Number,
    description: "Token multiplier",
    example: 1.2,
  })
  public readonly multiplier: number;

  @ApiProperty({
    type: String,
    description: "Token type",
    example: "Native",
  })
  public readonly type: string;

  @ApiProperty({
    type: String,
    description: "Token yield type",
    isArray: true,
  })
  public readonly yieldType: string[];

  @ApiProperty({
    type: String,
    description: "Token id in coingecko",
    isArray: true,
  })
  public readonly cgPriceId: string;
}
