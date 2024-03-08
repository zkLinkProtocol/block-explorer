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

export class AccountPointResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "account point",
    type: AccountPointsDto,
  })
  public readonly result: AccountPointsDto;
}
