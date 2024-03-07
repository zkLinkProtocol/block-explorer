import { ApiProperty } from "@nestjs/swagger";

export class BatchRootDto {
  @ApiProperty({
    type: String,
    description: "The hash of this batchRoot be executed on secondary chain",
    example: "0x5e018d2a81dbd1ef80ff45171dd241cb10670dcb091e324401ff8f52293841b0",
  })
  public readonly transactionHash: string;

  @ApiProperty({
    type: String,
    description: "Root hash of the batch",
    required: false,
    example: "0x1915069f839c80d8bf1df2ba08dc41fbca1fcae62ecf3a148dda013d520a3638",
    examples: ["0x1915069f839c80d8bf1df2ba08dc41fbca1fcae62ecf3a148dda013d520a3638", null],
  })
  public readonly rootHash?: string;

  @ApiProperty({ type: Number, description: "The height (number) of the batch", example: 10 })
  public readonly l1BatchNumber: number;

  @ApiProperty({
    type: Date,
    description: "Date when the batch was executed",
    example: new Date("2022-09-15T15:13:57.035Z"),
    examples: [new Date("2022-09-15T15:13:57.035Z"), null],
  })
  public readonly executedAt: Date;

  @ApiProperty({ type: Number, description: "chainId of the batchRoot", example: 1 })
  public readonly chainId: number;
}
