import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import { BalanceRepository, MonitAddressHistoryRepository } from "../repositories";
import { ConfigService } from "@nestjs/config";
import { BigNumber, ethers } from "ethers";
import { networkChainIdMap } from "../config";
import { providerByChainId } from "../utils/providers";
import waitFor from "../utils/waitFor";

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
    private readonly updateMonitorZKLHistoryInterval: number
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
        this.updateMonitorZKLHistoryInterval = 6 * 1000 ;//60 * 60 * 1000;
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



        await waitFor(() => !this.currentProcessPromise, this.updateMonitorZKLHistoryInterval);
        if (!this.currentProcessPromise) {
            return;
        }

        return this.runProcess();
    }

    private async recordDailyZKLAmount(): Promise<void> {
        const zklEthAddress = '0xfC385A1dF85660a7e041423DB512f779070FCede';
        const zklNovaAddress = '0xC967dabf591B1f4B86CFc74996EAD065867aF19E';
        let records = [];
        for (let i = 0;i<this.monitorAddressList.length;i++){
            const amount = await this.getTodayZKLAmountByAddress(this.monitorAddressList[i].Address,zklNovaAddress,zklEthAddress,this.monitorAddressList[i].Network);
            records.push({
                address: this.monitorAddressList[i].Address,
                zklAmount: BigNumber.from(amount),
                change: BigNumber.from(0),
                timestamp: new Date(),
                owner: this.monitorAddressList[i].Owner,
                vested: this.monitorAddressList[i].Vested,
                type: this.monitorAddressList[i].Type,
                network: this.monitorAddressList[i].Network,
            });
            await this.monitAddressHistoryRepository.add({
                address: this.monitorAddressList[i].Address,
                zklAmount: BigNumber.from(amount),
                change: BigNumber.from(0),
                timestamp: new Date(),
                owner: this.monitorAddressList[i].Owner,
                vested: this.monitorAddressList[i].Vested,
                type: this.monitorAddressList[i].Type,
                network: this.monitorAddressList[i].Network,
            });
        }
        console.log(records);
        try {
            await this.monitAddressHistoryRepository.addMany(records);
        }catch (error){
            console.log("monitor error",error);
        }
    }

    private async getTodayZKLAmountByAddress(address: string, tokenNovaAddress: string, tokenEthAddress: string ,network: string){
        if (network.toLowerCase() === 'zkLink Nova'.toLowerCase()){
            // console.log("nova zkl amount",ans," address: ",address);
            return await this.balanceRepository.findOne(address, tokenNovaAddress) ;
        }else if (network.toLowerCase() === 'Ethereum'.toLowerCase()){
            // console.log("ethereum zkl amount",ans," address: ",address);
            return await this.getTokenOtherChainZKLAmount(address, tokenEthAddress, network);
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
            return "0";
        }
    }
}