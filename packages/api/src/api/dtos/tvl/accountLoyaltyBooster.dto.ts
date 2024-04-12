import { ApiProperty } from "@nestjs/swagger";
import { ResponseBaseDto } from "../common/responseBase.dto";

export class AccountLoyaltyBoosterDto {
  @ApiProperty({
    type: Number,
    description: "loyalty booster",
    example: "1.03",
  })
  public readonly loyaltyBooster: number;

  @ApiProperty({
    type: String,
    description: "account address",
    example: "0x433",
  })
  public readonly address: string;
}

export class AccountLoyaltyBoosterResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "account loyalty booster",
    type: AccountLoyaltyBoosterDto,
  })
  public readonly result: AccountLoyaltyBoosterDto;
}
