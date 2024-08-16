import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import { AddressTransferRepository, BalanceRepository, MonitAddressHistoryRepository } from "../repositories";
import { ConfigService } from "@nestjs/config";
import { BigNumber } from "ethers";
import { networkChainIdMap } from "../config";
import { Cron } from "@nestjs/schedule";
import { sleep } from "zksync-web3/build/src/utils";

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
    private readonly CHAINBASEAPIKEY :string;
    private readonly chainBaseUrl: string;
    public constructor(
        private readonly monitAddressHistoryRepository :MonitAddressHistoryRepository,
        private readonly balanceRepository :BalanceRepository,
        private readonly addressTransferRepository :AddressTransferRepository,
        configService: ConfigService,
    ) {
        super();
        this.logger = new Logger(DailyMonitorZKLAmountService.name);
        this.monitorAddressList = configService.get<IMonitorAddress[]>("monitor.monitorAddressList");
        this.CHAINBASEAPIKEY = configService.get<string>("CHAIN_BASE_API_KEY");
        this.chainBaseUrl = 'https://api.chainbase.online/v1/';
    }

    @Cron('0 30 * * * *', { name: 'daily-monitor-task', timeZone: 'UTC' })
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
            const amount = await this.getTodayZKLAmountByAddress(this.monitorAddressList[i].Address,zklNovaAddress,zklEthAddress,this.monitorAddressList[i].Network,this.monitorAddressList[i].Owner);
            const time = new Date();
            const timeStr = time.getFullYear()+'-'+(time.getMonth()+1)+'-'+time.getDate();
            const preAmount = await this.monitAddressHistoryRepository.findYesterdayLastZKLAmount(this.monitorAddressList[i].Address,this.monitorAddressList[i].Network,this.monitorAddressList[i].Owner,timeStr);
            const nowAmount = BigNumber.from(amount);
            const changeAmount = nowAmount.sub(BigNumber.from(preAmount));
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
            if (this.monitorAddressList[i].Type === "CEX Wallet"){
                const ownerStr = "Total_"+this.monitorAddressList[i].Network+"_"+this.monitorAddressList[i].Owner+"_User";
                const time = new Date();
                const timeStr = time.getFullYear()+'-'+(time.getMonth()+1)+'-'+time.getDate();
                const preUserAmount = await this.monitAddressHistoryRepository.findYesterdayLastZKLAmount(this.monitorAddressList[i].Address,this.monitorAddressList[i].Network,ownerStr,timeStr);
                let userAmount = await this.getUserZKLAmountByAddress(this.monitorAddressList[i].Address,zklNovaAddress,zklEthAddress,this.monitorAddressList[i].Network);
                if (userAmount === "0"){
                    userAmount = preUserAmount;
                }
                const userNowAmount = BigNumber.from(userAmount);
                const changeUserAmount = userNowAmount.sub(BigNumber.from(preUserAmount));
                records.push({
                    address: this.monitorAddressList[i].Address,
                    zklAmount: userNowAmount,
                    change: changeUserAmount,
                    timestamp: new Date(),
                    owner: ownerStr,
                    vested: this.monitorAddressList[i].Vested,
                    type: this.monitorAddressList[i].Type,
                    network: this.monitorAddressList[i].Network,
                });
            }
        }
        await this.monitAddressHistoryRepository.addMany(records);
    }

    private async getTodayZKLAmountByAddress(address: string, tokenNovaAddress: string, tokenEthAddress: string ,network: string, owner: string){
        if (network.toLowerCase() === 'zkLink Nova'.toLowerCase()){
            return await this.balanceRepository.findOne(address, tokenNovaAddress) ;
        }else if (network.toLowerCase() === 'Ethereum'.toLowerCase()){
            const preAmount = await this.monitAddressHistoryRepository.findYesterdayLastZKLAmount(address,network,owner);
            const result =  await this.getTokenOtherChainZKLAmount(address, tokenEthAddress, network);
            if (result === "networkError"){
                return preAmount;
            }else {
                return result;
            }
        }
    }
    private async getUserZKLAmountByAddress(address: string, tokenNovaAddress: string, tokenEthAddress: string ,network: string){
        const toDate = new Date();
        const fromDate = new Date();
        if (network.toLowerCase() === 'zkLink Nova'.toLowerCase()){
            fromDate.setHours(fromDate.getHours() - 1);
            try {
                let ans = BigNumber.from(0);
                let addressSet = new Set<string>;
                const transferList =  await this.addressTransferRepository.findAll(address,tokenNovaAddress,fromDate.toISOString(),toDate.toISOString());
                for (let i = 0;i<transferList.length;i++){
                    const toAddress='0x' + transferList[i].transfer_to.toString('hex');
                    if (toAddress.toLowerCase() === address.toLowerCase()){
                        const fromAddress = '0x' + transferList[i].transfer_from.toString('hex');
                        addressSet.add(fromAddress);
                    }
                }
                for (let value of addressSet){
                    const result = await this.balanceRepository.findOne(value, tokenNovaAddress) ;
                    ans = ans.add(BigNumber.from(result));
                }
                return ans.toString();
            }catch (error){
                return "0"
            }
        }else if (network.toLowerCase() === 'Ethereum'.toLowerCase()){
            const result = await this.getOtherChainZKLTransfers(address,tokenEthAddress,Math.floor(fromDate.getTime() / 1000).toString(),Math.floor(toDate.getTime() / 1000).toString(),network);
            if (typeof result === "string" && result === "networkError"){
                return "0";
            }else{
                let ans = BigNumber.from(0);
                let count = 1;
                for (let value of result){
                    const ansItem = await this.getTokenOtherChainZKLAmount(value,tokenEthAddress,network);
                    if (ansItem !== "networkError"){
                        ans = ans.add(BigNumber.from(ansItem));
                    }
                    count = count + 1;
                    if (count > 500){
                        this.logger.log(`CEX ${address} User too many send ZKL in eth ${result.size},the total user amount will be smaller`);
                        break;
                    }
                }
                return ans.toString();
            }
        }
    }
    private async getTokenOtherChainZKLAmount(address: string, tokenAddress: string, network: string): Promise<string> {
        try {
            const options = {method: 'GET', headers: {'x-api-key': this.CHAINBASEAPIKEY}} ;
            const balanceResponse = await fetch(`${this.chainBaseUrl}account/tokens?chain_id=${networkChainIdMap[network.toLowerCase()]}&contract_address=${tokenAddress}&address=${address}`, options);
            const response =await balanceResponse.json();
            await sleep(500);
            if (response?.message === 'ok' && response.data?.length > 0){
                return BigNumber.from(response.data[0]?.balance).toString();
            }else{
                return "networkError"
            }
        }catch (error){
            return "networkError";
        }
    }

    private async getOtherChainZKLTransfers(address: string, tokenAddress: string, fromDate :string, toDate :string, network :string){
        try {
            let page = 1;
            const limit = 99;
            let ans =new Set<string>;
            let pageLimit = 1;
            do {
                const options = {method: 'GET', headers: {'x-api-key': this.CHAINBASEAPIKEY}} ;
                const transfersResponse = await fetch(`${this.chainBaseUrl}token/transfers?chain_id=${networkChainIdMap[network.toLowerCase()]}&contract_address=${tokenAddress}&address=${address}&from_timestamp=${fromDate}&end_timestamp=${toDate}&page=${page}&limit=${limit}`, options);
                const response =await transfersResponse.json();
                page = page + 1;
                await sleep(500);
                if (response?.message === 'ok' && response.data?.length > 0){
                    pageLimit = Math.ceil(response.count / limit);
                    for (let i = 0;i<response.data.length;i++){
                        if (response.data[i].to_address.toLowerCase() === address.toLowerCase()){
                            ans.add(response.data[i].from_address);
                        }
                    }
                }else{
                    return ans;
                }
            }while (page <= pageLimit);
            return ans ;
        }catch (error){
            return "networkError";
        }
    }
}