import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class DateDto {
    @ApiPropertyOptional({
        description: 'The date for fetching history token balance data. Should be like YYYY-MM-DD.',
        example: '2024-05-20',
    })
    @IsOptional()
    public readonly date: string;
}