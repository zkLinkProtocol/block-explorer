import { ApiProperty } from "@nestjs/swagger";

export class DepositThresholdDto {
  @ApiProperty({
    type: Number,
    description: "Deposit Threshold ETH amount",
    example: "0.1",
  })
  public readonly ethAmount: number;
}
