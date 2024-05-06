import { Injectable, Logger } from "@nestjs/common";
import waitFor from "../utils/waitFor";
import { Worker } from "../common/worker";
import {
    TransactionRepository,
    DailyTransactionHistoryRepository,
    AddressTransactionRepository
} from "../repositories";
import {ConfigService} from "@nestjs/config";
@Injectable()
export class DailyTransactionService extends Worker {
    private readonly updateGateWayInterval: number;
    private readonly logger: Logger;
    configService: ConfigService;
    public constructor(
        private readonly dailyTransactionHistoryRepository:DailyTransactionHistoryRepository,
        private readonly transactionRepository:TransactionRepository,
        private readonly addressTransactionRepository:AddressTransactionRepository,
        configService: ConfigService
    ) {
        super();
        this.updateGateWayInterval = 24 * 60 * 60 * 1000;
        this.logger = new Logger(DailyTransactionService.name);
    }

    protected async runProcess(): Promise<void> {
        try {
            await this.recordDailyTransaction();
        } catch (err) {
            this.logger.error({
                message: "Failed to save daily transaction",
                originalError: err,
            });
        }

        await waitFor(() => !this.currentProcessPromise, this.updateGateWayInterval);
        if (!this.currentProcessPromise) {
            return;
        }

        return this.runProcess();
    }

    private async recordDailyTransaction(): Promise<void> {
        const time = new Date();
        time.setDate(time.getDate() - 1);
        const timeStr = time.getFullYear()+'-'+(time.getMonth()+1)+'-'+time.getDate();
        await this.dailyTransactionHistoryRepository.add({
            timestamp: time,
            txNum:await this.transactionRepository.countTransactionsOnDate(timeStr),
            exchangeNum:await this.addressTransactionRepository.countAddressOnDate(timeStr),
        })
    }
}