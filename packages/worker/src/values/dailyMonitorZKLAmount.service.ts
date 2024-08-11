import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import { BalanceRepository, MonitAddressHistoryRepository } from "../repositories";
import { ConfigService } from "@nestjs/config";
import { BigNumber, ethers } from "ethers";
import { networkChainIdMap } from "../config";
import { providerByChainId } from "../utils/providers";
import { Cron } from "@nestjs/schedule";

export interface IMonitorAddress {
    "Address": string,
    "Owner": string,
    "Vested": string,
    "Type": string,
    "ZKL Amount": string,
    "Network": string
}
@Injectable()
export class DailyMonitorZKLAmountService extends Worker {
    private readonly logger: Logger;
    configService: ConfigService;
    private readonly monitorAddressList :IMonitorAddress[];
    public constructor(
        private readonly monitAddressHistoryRepository :MonitAddressHistoryRepository,
        private readonly balanceRepository :BalanceRepository,
        configService: ConfigService,
    ) {
        super();
        this.logger = new Logger(DailyMonitorZKLAmountService.name);
        this.monitorAddressList = configService.get<IMonitorAddress[]>("monitor.monitorAddressList");
    }

    @Cron('0 40 * * * *', { name: 'daily-monitor-task', timeZone: 'UTC' })
    async handleDailyTransactionService() {
        this.logger.log('Daily monitor task executed ');
        await this.runProcess();
    }
    protected async runProcess(): Promise<void> {
        try {
            await this.recordDailyZKLAmount();
        } catch (err) {
            this.logger.error({
                message: "Failed to save daily ZKL amount",
                originalError: err,
            });
        }
    }

    private async recordDailyZKLAmount(): Promise<void> {
        const zklEthAddress = '0xfC385A1dF85660a7e041423DB512f779070FCede';
        const zklNovaAddress = '0xC967dabf591B1f4B86CFc74996EAD065867aF19E';
        let records = [];
        for (let i = 0;i<this.monitorAddressList.length;i++){
            const amount = await this.getTodayZKLAmountByAddress(this.monitorAddressList[i].Address,zklNovaAddress,zklEthAddress,this.monitorAddressList[i].Network);
            const time = new Date();
            const timeStr = time.getFullYear()+'-'+(time.getMonth()+1)+'-'+time.getDate();
            const preAmount = await this.monitAddressHistoryRepository.findYesterdayLastZKLAmount(this.monitorAddressList[i].Address,this.monitorAddressList[i].Network,timeStr);
            const nowAmount = BigNumber.from(amount);
            const changeAmount = BigNumber.from(nowAmount).sub(preAmount);
            records.push({
                address: this.monitorAddressList[i].Address,
                zklAmount: nowAmount,
                change: changeAmount,
                timestamp: new Date(),
                owner: this.monitorAddressList[i].Owner,
                vested: this.monitorAddressList[i].Vested,
                type: this.monitorAddressList[i].Type,
                network: this.monitorAddressList[i].Network,
            });
        }
        await this.monitAddressHistoryRepository.addMany(records);
    }

    private async getTodayZKLAmountByAddress(address: string, tokenNovaAddress: string, tokenEthAddress: string ,network: string){
        if (network.toLowerCase() === 'zkLink Nova'.toLowerCase()){
            return await this.balanceRepository.findOne(address, tokenNovaAddress) ;
        }else if (network.toLowerCase() === 'Ethereum'.toLowerCase()){
            const preAmount = await this.monitAddressHistoryRepository.findYesterdayLastZKLAmount(address,network);
            const result =  await this.getTokenOtherChainZKLAmount(address, tokenEthAddress, network);
            if (result === "networkError"){
                return preAmount;
            }else {
                return result;
            }
        }
    }
    private async getTokenOtherChainZKLAmount(address: string, tokenAddress: string, network: string): Promise<string> {
        try {
            if (network.toLowerCase() in networkChainIdMap) {
                const provider = providerByChainId(networkChainIdMap[network.toLowerCase()]);
                const func = ethers.utils.FunctionFragment.from(
                    `balanceOf(address)`
                );
                const iface = new ethers.utils.Interface([func]);
                const data = iface.encodeFunctionData(func, [address])
                const balance = await provider.send("eth_call", [{ to: tokenAddress, data }, "latest"]);
                return balance.toString();
            } else {
                return "0";
            }
        }catch (error){
            return "networkError";
        }
    }
}