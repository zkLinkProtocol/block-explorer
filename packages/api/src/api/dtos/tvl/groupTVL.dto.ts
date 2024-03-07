import { ApiProperty } from "@nestjs/swagger";
import { ResponseBaseDto } from "../common/responseBase.dto";

export class GroupTotalTVLResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "group total tvl",
    type: Number,
  })
  public readonly result: number;
}
