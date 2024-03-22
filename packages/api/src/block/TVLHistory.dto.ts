import { ApiProperty } from "@nestjs/swagger";
import { BigNumber } from "ethers";

export class TVLHistoryDto {
  @ApiProperty({
    type: Number,
    description: "id",
    example: "1234",
  })
  public readonly id: number;

  @ApiProperty({
    type: String,
    description: "total tvl",
    example: "1234",
  })
  public readonly tvl: string;

  @ApiProperty({
    type: Date,
    description: "Date when the block was executed",
    example: new Date("2022-09-15T15:13:57.035Z"),
    examples: [new Date("2022-09-15T15:13:57.035Z"), null],
  })
  public readonly timestamp: Date;
}
