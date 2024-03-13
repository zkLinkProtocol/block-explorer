import { ApiProperty } from "@nestjs/swagger";
import { ResponseBaseDto } from "../common/responseBase.dto";

export class AccountPointsDto {
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
    type: String,
    description: "account address",
    example: "0x433",
  })
  public readonly address: string;
}

export class AccountPointsResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "account points",
    type: AccountPointsDto,
    isArray: true,
  })
  public readonly result: AccountPointsDto[];
}

export class PointHistoryDto {
  @ApiProperty({ type: String })
  public readonly address: string;

  @ApiProperty({ type: Number })
  public readonly blockNumber: number;

  @ApiProperty({ type: Number } )
  public readonly stakePoint: number;

  @ApiProperty({ type: Number })
  public readonly refPoint: number;

  @ApiProperty({ type: String })
  public readonly updateType: string;
}

export class PointsHistoryResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "account points",
    type: PointHistoryDto,
    isArray: true,
  })
  public readonly result: PointHistoryDto[];
}

export class AccountPointResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "account point",
    type: AccountPointsDto,
  })
  public readonly result: AccountPointsDto;
}
