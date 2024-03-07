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
}

export class AccountPointsResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "account points",
    type: AccountPointsDto,
  })
  public readonly result: AccountPointsDto;
}
