import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class FinancialReportDto {
  @IsUUID()
  @IsString()
  walletId: string;

  @IsDateString()
  @IsOptional()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate: string;
}
