import {Injectable, Logger, NotFoundException} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Worker } from "./worker";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import { getHistoryTokenList } from "../configureApp";
import { TokenService } from "../token/token.service";
import { BigNumber } from "ethers";
import { normalizeAddressTransformer } from "../common/transformers/normalizeAddress.transformer";
import * as path from "path";
@Injectable()
export class HistoryTokenService extends Worker {
    private readonly logger: Logger;
    configService: ConfigService;
    public constructor(
        private readonly tokenService:TokenService,
        configService: ConfigService
    ) {
        super();
        this.logger = new Logger(HistoryTokenService.name);
    }
    @Cron('0 0 1 * * *', { name: 'daily-morning-task', timeZone: 'UTC' })
    async handleHistoryTokenService() {
        this.logger.log('Daily History Token save address task executed at 1:00 UTC');
        this.runProcess();
    }
    protected async runProcess(): Promise<void> {
        try {
            await this.recordDailyTokenBalance();
        } catch (err) {
            this.logger.error({
                message: "Failed to save History Token address",
                originalError: err,
            });
        }
    }

    private async recordDailyTokenBalance(): Promise<void> {
        const time = new Date();
        time.setDate(time.getDate() - 1);
        const timeStr = time.getFullYear()+'-'+(time.getMonth()+1)+'-'+time.getDate();
        const recordHistoryTokenList =  await getHistoryTokenList();
        for (let i = 0; i < recordHistoryTokenList.length; i++) {
            const historyToken = recordHistoryTokenList[i];
            const token = await this.tokenService.findOne(historyToken.address);
            if (!token) {
                this.logger.error("token "+ historyToken.address +" is not found ");
                continue;
            }
            const result = await this.tokenService.getAllBalanceByToken(historyToken.address);
            const tokenBals = result.map((bal) => {
                const balance = BigNumber.from(bal.balanceNum).div(BigNumber.from(10).pow(token.decimals)).toString();
                let balanceDeciaml= BigNumber.from(bal.balanceNum).mod(BigNumber.from(10).pow(token.decimals)).toString();
                if (!balanceDeciaml.startsWith('0')){
                    while (balanceDeciaml.length < token.decimals){
                        balanceDeciaml = '0' + balanceDeciaml;
                    }
                }
                return {
                    balance:balance+'.'+balanceDeciaml,
                    address: normalizeAddressTransformer.from(bal.address),
                };
            });
            const jsonString = JSON.stringify(tokenBals, null, 2);
            const filePath = path.join(__dirname, '../../historyTokenJson/'+historyToken.name+'-'+timeStr+'.json');
            fs.writeFile(filePath, jsonString, (err) => {
                if (err) {
                    this.logger.error('Error writing file'+ filePath +':', err);
                    return;
                }
                this.logger.log('The history token balance json file '+ filePath +' has been saved!');
            });
        }
    }
}