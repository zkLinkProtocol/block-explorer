import { ApiProperty } from "@nestjs/swagger";
import { ResponseBaseDto } from "../common/responseBase.dto";

export class TotalTVLResponseDto extends ResponseBaseDto {
  @ApiProperty({
    description: "total tvl",
    type: Number,
  })
  public readonly result: number;
}
