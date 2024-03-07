import { ApiProperty } from "@nestjs/swagger";
import { ResponseBaseDto } from "../common/responseBase.dto";

export class AccountRankDto {
  @ApiProperty({
    type: Number,
    description: "nova point",
    example: "300",
  })
  public readonly novaPoint: number;

  @ApiProperty({
    type: Number,
    description: "invite point",
    example: "45",
  })
  public readonly referPoint: number;

  @ApiProperty({
    type: Number,
    description: "rank",
    example: "45",
  })
  public readonly rank: number;

  @ApiProperty({
    type: String,
    description: "Inviter address",
    example: "0x433",
  })
  public readonly inviteBy: string;

  @ApiProperty({
    type: String,
    description: "account address",
    example: "0x433",
  })
  public readonly address: string;
}

export class AccountRankResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "account rank",
    type: AccountRankDto,
  })
  public readonly result: AccountRankDto;
}
