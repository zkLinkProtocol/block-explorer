import { ApiProperty } from "@nestjs/swagger";

export class DailyTransactionDto {

  @ApiProperty({
    type: Number,
    description: "The daily transaction in the block",
    example: 3233097,
  })
  public readonly txNum: number;

  @ApiProperty({
    type: Number,
    description: "The daily exchange address number",
    example: 114514,
  })
  public readonly exchangeNum: number;

  @ApiProperty({
    type: Date,
    description: "The timestamp when the transaction was received",
    example: new Date("2022-11-21T18:16:51.000Z"),
  })
  public readonly timestamp: Date;
}
