import { IsString, IsNumber, IsPositive, IsISO8601 } from 'class-validator';

export class PriceInputDto {
  @IsString()
  symbol: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsString()
  source: string;

  @IsISO8601()
  timestamp: string;
}
