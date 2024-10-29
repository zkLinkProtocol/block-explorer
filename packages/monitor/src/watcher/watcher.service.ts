import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { sleep } from "../untils/sleep";
import {
    BalanceRepository,
    BlockRepository,
    TransferRepository,
    MonitAddressConfigListRepository,
    MonitAddressHistoryRepository,
    MonitAddressLastRepository,
    MonitorChainRecordRepository,
    MonitAddressUserListRepository,
} from "../repositories";
import { BigNumber } from "ethers";
import { findETHMasterListAndAmount } from "./subgraph";
import { Balance, Block } from "../entities";
import { networkChainIdMap } from "../config";
import { groupId, monitorZKLValue } from "./botConfig";

export interface IMonitorAddress {
    "Address": string,
    "Owner": string,
    "Vested": string,
    "Type": string,
    "ZKL Amount": string,
    "Network": string
}

export interface IEThData {
    "holders": holder[],
    "_meta": {
        "block": {
            "number": number
        }
    }
}

export interface holder {
    accountType: string,
    balance: string,
    id: string
}
@Injectable()
export class MonitorZKLAmountService implements OnModuleInit {
    private readonly logger: Logger;
    configService: ConfigService;
    private readonly monitorAddressList :IMonitorAddress[];
    private readonly chainBaseKey :string;
    private readonly chainBaseUrl: string;
    private readonly zklEthAddress: string;
    private readonly zklNovaAddress: string;
    private readonly needInit: boolean;
    private readonly botUrl: string;
    private readonly blockNumberRecordETHName = 'eth_blockNumber';
    private readonly blockNumberRecordNovaName = 'nova_blockNumber';
    public constructor(
        private readonly monitAddressHistoryRepository :MonitAddressHistoryRepository,
        private readonly balanceRepository :BalanceRepository,
        private readonly blockRepository :BlockRepository,
        private readonly transferRepository :TransferRepository,
        private readonly monitAddressConfigListRepository :MonitAddressConfigListRepository,
        private readonly monitAddressLastRepository :MonitAddressLastRepository,
        private readonly monitorChainRecordRepository :MonitorChainRecordRepository,
        private readonly monitAddressUserListRepository :MonitAddressUserListRepository,
        configService: ConfigService,
    ) {
        this.logger = new Logger(MonitorZKLAmountService.name);
        this.monitorAddressList = configService.get<IMonitorAddress[]>("monitor.monitorAddressList");
        this.chainBaseKey = configService.get<string>("monitor.chainBaseApiKey");
        this.botUrl = configService.get<string>("monitor.bot");
        this.chainBaseUrl = 'https://api.chainbase.online/v1/';
        this.needInit = configService.get<boolean>("monitor.needInit");
        this.zklEthAddress = '0xfC385A1dF85660a7e041423DB512f779070FCede';
        this.zklNovaAddress = '0xC967dabf591B1f4B86CFc74996EAD065867aF19E';
    }
    async onModuleInit() {
        this.logger.log('monitor service init');
        this.runProcess();
    }

    @Cron('0 30 0 * * *', { name: 'monitor-daily-save-data', timeZone: 'UTC' })
    async handleDailyTransactionService() {
        this.logger.log('Daily monitor task executed ');
        const recordDailyData = await this.monitAddressLastRepository.find({})
        const record = [];
        for (const data of recordDailyData) {
            record.push({
                address: data.address,
                zklAmount: data.zklAmount,
                change: data.change,
                timestamp: new Date(),
                owner: data.owner,
                vested: data.vested,
                type: data.type,
                network: data.network
            })
        }
        await this.monitAddressHistoryRepository.addMany(record);
        await sleep(3000);
    }

    protected async runProcess(): Promise<void> {
        try {
            if (this.needInit){
                await this.monitorInit();
            }
            await this.monitorZKLTransfer();
        } catch (err) {
            this.logger.error({
                message: "Failed to update zkl transfer",
                originalError: err,
            });
            console.log(err);
        }

        await sleep(3000);

        return this.runProcess();
    }
    async monitorZKLTransfer(){
            await this.monitorEthZklTransfer();
            await this.monitorNovaZklTransfer();
    }

    async monitorInit(){
        const blockNumberList = await this.monitorChainRecordRepository.find({});
        let initETHData : IEThData ;
        let initNovaData : Balance[];
        let initNovaBlock : Block;
        if (blockNumberList.length === 0){
            let records = [];
            initETHData = await findETHMasterListAndAmount();
                records.push({
                    chainNumber: initETHData?._meta?.block?.number,
                    name: this.blockNumberRecordETHName,
                });

            let novaAddressList = [];
            for (const t of this.monitorAddressList) {
                if (t.Network.toLowerCase() === 'zkLink Nova'.toLowerCase()){
                    novaAddressList.push(t.Address);
                }
            }
            [ initNovaData , initNovaBlock ] = await Promise.all([
                this.balanceRepository.findAllAddressAmount(novaAddressList,this.zklNovaAddress),
                this.blockRepository.getLastBlock(),
            ]);

            records.push({
                chainNumber: initNovaBlock?.number,
                name: this.blockNumberRecordNovaName,
            })
            await this.monitorChainRecordRepository.addMany(records);
        }

        const configList = await this.monitAddressConfigListRepository.find({});
        if (configList.length === 0){
            let records = [];
            for (let i = 0; i < this.monitorAddressList.length; i++) {
                records.push({
                    address: this.monitorAddressList[i].Address,
                    owner: this.monitorAddressList[i].Owner,
                    vested: this.monitorAddressList[i].Vested,
                    type: this.monitorAddressList[i].Type,
                    network: this.monitorAddressList[i].Network,
                });
            }
            await this.monitAddressConfigListRepository.addMany(records);
        } //init config to db

        const lastZKLAmountDataList = await this.monitAddressLastRepository.find({});
        if (lastZKLAmountDataList.length === 0){
            let records = [];
            for (let i = 0;i<this.monitorAddressList.length;i++){
                const amount = await this.getTodayZKLAmountByAddress(this.monitorAddressList[i].Address,this.zklNovaAddress,this.zklEthAddress,this.monitorAddressList[i].Network,this.monitorAddressList[i].Owner,initETHData,initNovaData);
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
                    records.push({
                        address: this.monitorAddressList[i].Address,
                        zklAmount: BigNumber.from(0),
                        change: BigNumber.from(0),
                        timestamp: new Date(),
                        owner: ownerStr,
                        vested: this.monitorAddressList[i].Vested,
                        type: this.monitorAddressList[i].Type,
                        network: this.monitorAddressList[i].Network,
                    });
                }
            }
            await this.monitAddressLastRepository.addMany(records);
        }
    }
    private async getTodayZKLAmountByAddress(address: string, tokenNovaAddress: string, tokenEthAddress: string ,network: string, owner: string, initETHData, initNovaData){
        if (network.toLowerCase() === 'zkLink Nova'.toLowerCase()){
            for (const t of initNovaData) {
                if (t.address.toLowerCase() === address.toLowerCase()){
                    return t.balance;
                }
            }
            return '0';
        }else if (network.toLowerCase() === 'Ethereum'.toLowerCase()){
            for (const holder of initETHData.holders) {
                if (holder.id.toLowerCase() === address.toLowerCase()){
                    return holder.balance;
                }
            }
            return '0';
        }
    }

    private async monitorEthZklTransfer(){
        const ethLookBlock = await this.monitorChainRecordRepository.findOneBy({
            name: this.blockNumberRecordETHName
        });
        const ethLookBlockNumber = Number(ethLookBlock.chainNumber) + 1;
        let ethNowBlockNumber = await this.getOtherChainNowBlock('Ethereum');
        if (ethNowBlockNumber === "networkError"){
            ethNowBlockNumber = ethLookBlockNumber;
        }
        const ethMaxLookBlockNumber = ethLookBlockNumber + 500;
        if (ethNowBlockNumber > ethMaxLookBlockNumber){
            ethNowBlockNumber = ethMaxLookBlockNumber;
        }
        if (ethLookBlockNumber > ethNowBlockNumber){
            return ;
        }

        const ethZklTransfer = await this.getOtherChainZKLTransfers(this.zklEthAddress,ethLookBlockNumber.toString(),ethNowBlockNumber.toString(),'Ethereum');
        ethZklTransfer.reverse();
        this.logger.log("from",ethLookBlockNumber.toString(),"to",ethNowBlockNumber.toString(),"len:",ethZklTransfer.length);
        for (const ethZklTransferElement of ethZklTransfer) {
            //from
            const monitAddressConfig = await this.monitAddressConfigListRepository.findOneBy({
                address: ethZklTransferElement.from_address
            });
            if (monitAddressConfig){
                const monitorLast = await this.monitAddressLastRepository.findOneBy({
                    address: monitAddressConfig.address,
                    owner: monitAddressConfig.owner
                })
                await this.monitAddressLastRepository.updataAmount(monitorLast.address,monitorLast.owner,monitorLast.network,monitorLast.zklAmount.sub(BigNumber.from(ethZklTransferElement.value)),monitorLast.change.sub(BigNumber.from(ethZklTransferElement.value)));
            }
            const monitAddressUser = await this.monitAddressUserListRepository.findOneBy({
                address: ethZklTransferElement.from_address,
                network: 'Ethereum'
            })
            if (monitAddressUser){
                await this.monitAddressUserListRepository.updataAmount(monitAddressUser.address,monitAddressUser.owner,monitAddressUser.network,monitAddressUser.zklAmount.sub(BigNumber.from(ethZklTransferElement.value)));
                const monitorLastCEXTotalUser = await this.monitAddressLastRepository.findOneBy({
                    owner: `Total_${monitAddressUser.network}_${monitAddressUser.owner}`
                })
                await this.monitAddressLastRepository.updataAmount(monitorLastCEXTotalUser.address,monitorLastCEXTotalUser.owner,monitorLastCEXTotalUser.network,monitorLastCEXTotalUser.zklAmount.sub(BigNumber.from(ethZklTransferElement.value)),monitorLastCEXTotalUser.change.sub(BigNumber.from(ethZklTransferElement.value)));
            }

            //to
            const monitAddressConfigForTo = await this.monitAddressConfigListRepository.findOneBy({
                address: ethZklTransferElement.to_address
            });
            if (monitAddressConfigForTo){
                const monitorLast = await this.monitAddressLastRepository.findOneBy({
                    address: monitAddressConfigForTo.address,
                    owner: monitAddressConfigForTo.owner
                })
                await this.monitAddressLastRepository.updataAmount(monitorLast.address,monitorLast.owner,monitorLast.network,monitorLast.zklAmount.add(BigNumber.from(ethZklTransferElement.value)),monitorLast.change.add(BigNumber.from(ethZklTransferElement.value)));
            }
            const monitAddressUserForTo = await this.monitAddressUserListRepository.findOneBy({
                address: ethZklTransferElement.to_address,
                network: 'Ethereum'
            })
            if (monitAddressUserForTo){
                await this.monitAddressUserListRepository.updataAmount(monitAddressUserForTo.address,monitAddressUserForTo.owner,monitAddressUserForTo.network,monitAddressUserForTo.zklAmount.add(BigNumber.from(ethZklTransferElement.value)));
                const monitorLastCEXTotalUser = await this.monitAddressLastRepository.findOneBy({
                    owner: `Total_${monitAddressUserForTo.network}_${monitAddressUserForTo.owner}`
                })
                await this.monitAddressLastRepository.updataAmount(monitorLastCEXTotalUser.address,monitorLastCEXTotalUser.owner,monitorLastCEXTotalUser.network,monitorLastCEXTotalUser.zklAmount.add(BigNumber.from(ethZklTransferElement.value)),monitorLastCEXTotalUser.change.add(BigNumber.from(ethZklTransferElement.value)));
            }

            if (monitAddressConfigForTo && monitAddressConfigForTo.type === 'CEX Wallet'){
                const zklAmount = await this.getTokenOtherChainZKLAmount(ethZklTransferElement.from_address,this.zklEthAddress,'Ethereum');
                const insertMonitorAddressUser = await this.monitAddressUserListRepository.findOneBy({
                    address: ethZklTransferElement.from_address
                })
                if (!insertMonitorAddressUser){
                    await this.monitAddressUserListRepository.add({
                        address: ethZklTransferElement.from_address,
                        owner: `${monitAddressConfigForTo.owner}_User`,
                        vested: monitAddressConfigForTo.vested,
                        type: `${monitAddressConfigForTo.owner}_User`,
                        network: 'Ethereum',
                        zklAmount: BigNumber.from(zklAmount)
                    });
                    const monitorLastCEXTotalUser = await this.monitAddressLastRepository.findOneBy({
                        owner: `Total_${monitAddressConfigForTo.network}_${monitAddressConfigForTo.owner}_User`
                    })
                    await this.monitAddressLastRepository.updataAmount(monitorLastCEXTotalUser.address,monitorLastCEXTotalUser.owner,monitorLastCEXTotalUser.network,monitorLastCEXTotalUser.zklAmount.add(BigNumber.from(zklAmount)),monitorLastCEXTotalUser.change.add(BigNumber.from(zklAmount)));
                }
            }

            const transferAmount = BigNumber.from(ethZklTransferElement.value);
            const zKLValue = BigNumber.from(monitorZKLValue);
            this.logger.log("amount:",transferAmount.toString(),"look value:",zKLValue.toString());
            if (transferAmount.gte(zKLValue)){
                let from = ethZklTransferElement.from_address;
                if (monitAddressConfig){
                    from += '  ' + monitAddressConfig.owner;
                }
                if (monitAddressUser){
                    from += '  ' + monitAddressUser.owner;
                }
                let to = ethZklTransferElement.to_address;
                if (monitAddressConfigForTo){
                    to += '  ' + monitAddressConfigForTo.owner;
                }
                if (monitAddressUserForTo){
                    to += '  ' + monitAddressUserForTo.owner;
                }
                await this.sendMessageToLarkGroup(from,to,'Ethereum',ethZklTransferElement.value,ethZklTransferElement.transaction_hash);
            }
        }

        //record blockNumber
        await this.monitorChainRecordRepository.updataBlockNumber(this.blockNumberRecordETHName,ethNowBlockNumber);
    }

    private async monitorNovaZklTransfer(){
        const novaLookBlock = await this.monitorChainRecordRepository.findOneBy({
            name: this.blockNumberRecordNovaName
        })
        const novaLookBlockNumber = Number(novaLookBlock.chainNumber) + 1;
        const novaNowBlock = await this.blockRepository.getLastBlock();
        const novaNowBlockNumber = novaNowBlock.number;
        if (novaLookBlockNumber > novaNowBlockNumber){
            return ;
        }

        const novaZklTransfer = await this.transferRepository.findAll(this.zklNovaAddress,novaLookBlockNumber.toString(),novaNowBlockNumber.toString());
        for (const novaZklTransferElement of novaZklTransfer) {
            //from
            const fromAddress = '0x' + novaZklTransferElement.transfers_from.toString('hex');
            const monitAddressConfig = await this.monitAddressConfigListRepository.findOneBy({
                address: fromAddress
            });
            if (monitAddressConfig){
                const monitorLast = await this.monitAddressLastRepository.findOneBy({
                    address: monitAddressConfig.address,
                    owner: monitAddressConfig.owner
                })
                await this.monitAddressLastRepository.updataAmount(monitorLast.address,monitorLast.owner,monitorLast.network,monitorLast.zklAmount.sub(BigNumber.from(novaZklTransferElement.transfers_amount)),monitorLast.change.sub(BigNumber.from(novaZklTransferElement.transfers_amount)));
            }
            const monitAddressUser = await this.monitAddressUserListRepository.findOneBy({
                address: fromAddress,
                network: 'zkLink Nova'
            })
            if (monitAddressUser){
                await this.monitAddressUserListRepository.updataAmount(monitAddressUser.address,monitAddressUser.owner,monitAddressUser.network,monitAddressUser.zklAmount.sub(BigNumber.from(novaZklTransferElement.transfers_amount)));
                const monitorLastCEXTotalUser = await this.monitAddressLastRepository.findOneBy({
                    owner: `Total_${monitAddressUser.network}_${monitAddressUser.owner}`
                })
                await this.monitAddressLastRepository.updataAmount(monitorLastCEXTotalUser.address,monitorLastCEXTotalUser.owner,monitorLastCEXTotalUser.network,monitorLastCEXTotalUser.zklAmount.sub(BigNumber.from(novaZklTransferElement.transfers_amount)),monitorLastCEXTotalUser.change.sub(BigNumber.from(novaZklTransferElement.transfers_amount)));
            }

            //to
            const toAddress='0x' + novaZklTransferElement.transfers_to.toString('hex');
            const monitAddressConfigForTo = await this.monitAddressConfigListRepository.findOneBy({
                address: toAddress
            });
            if (monitAddressConfigForTo){
                const monitorLast = await this.monitAddressLastRepository.findOneBy({
                    address: monitAddressConfigForTo.address,
                    owner: monitAddressConfigForTo.owner
                })
                await this.monitAddressLastRepository.updataAmount(monitorLast.address,monitorLast.owner,monitorLast.network,monitorLast.zklAmount.add(BigNumber.from(novaZklTransferElement.transfers_amount)),monitorLast.change.add(BigNumber.from(novaZklTransferElement.transfers_amount)));
            }
            const monitAddressUserForTo = await this.monitAddressUserListRepository.findOneBy({
                address: toAddress,
                network: 'zkLink Nova'
            })
            if (monitAddressUserForTo){
                await this.monitAddressUserListRepository.updataAmount(monitAddressUserForTo.address,monitAddressUserForTo.owner,monitAddressUserForTo.network,monitAddressUserForTo.zklAmount.add(BigNumber.from(novaZklTransferElement.transfers_amount)));
                const monitorLastCEXTotalUser = await this.monitAddressLastRepository.findOneBy({
                    owner: `Total_${monitAddressUserForTo.network}_${monitAddressUserForTo.owner}`
                })
                await this.monitAddressLastRepository.updataAmount(monitorLastCEXTotalUser.address,monitorLastCEXTotalUser.owner,monitorLastCEXTotalUser.network,monitorLastCEXTotalUser.zklAmount.add(BigNumber.from(novaZklTransferElement.transfers_amount)),monitorLastCEXTotalUser.change.add(BigNumber.from(novaZklTransferElement.transfers_amount)));
            }

            if (monitAddressConfigForTo && monitAddressConfigForTo.type === 'CEX Wallet'){
                const insertMonitorAddressUser = await this.monitAddressUserListRepository.findOneBy({
                    address: fromAddress
                })
                if (!insertMonitorAddressUser){
                    const zklAmount = await this.balanceRepository.findOne(fromAddress,this.zklNovaAddress);
                    await this.monitAddressUserListRepository.add({
                        address: fromAddress,
                        owner: `${monitAddressConfigForTo.owner}_User`,
                        vested: monitAddressConfigForTo.vested,
                        type: `${monitAddressConfigForTo.owner}_User`,
                        network: 'zkLink Nova',
                        zklAmount: BigNumber.from(zklAmount)
                    });
                    const monitorLastCEXTotalUser = await this.monitAddressLastRepository.findOneBy({
                        owner: `Total_${monitAddressConfigForTo.network}_${monitAddressConfigForTo.owner}_User`
                    })
                    await this.monitAddressLastRepository.updataAmount(monitorLastCEXTotalUser.address,monitorLastCEXTotalUser.owner,monitorLastCEXTotalUser.network,monitorLastCEXTotalUser.zklAmount.add(BigNumber.from(zklAmount)),monitorLastCEXTotalUser.change.add(BigNumber.from(zklAmount)));
                }
            }
            const transferAmount = BigNumber.from(novaZklTransferElement.transfers_amount);
            const zKLValue = BigNumber.from(monitorZKLValue);
            this.logger.log("amount:",transferAmount.toString(),"look value:",zKLValue.toString());
            if (transferAmount.gte(zKLValue)){
                let from = fromAddress;
                if (monitAddressConfig){
                    from += '  ' + monitAddressConfig.owner;
                }
                if (monitAddressUser){
                    from += '  ' + monitAddressUser.owner;
                }
                let to = toAddress;
                if (monitAddressConfigForTo){
                    to += '  ' + monitAddressConfigForTo.owner;
                }
                if (monitAddressUserForTo){
                    to += '  ' + monitAddressUserForTo.owner;
                }
                let txHash = '0x' + novaZklTransferElement.transfers_transactionHash.toString('hex');
                await this.sendMessageToLarkGroup(from,to,'zkLink Nova',novaZklTransferElement.transfers_amount,txHash);
            }
        }



        //record blockNumber
        await this.monitorChainRecordRepository.updataBlockNumber(this.blockNumberRecordNovaName,novaNowBlockNumber);
    }

    private async getTokenOtherChainZKLAmount(address: string, tokenAddress: string, network: string): Promise<string> {
        try {
            const options = {method: 'GET', headers: {'x-api-key': this.chainBaseKey}} ;
            const balanceResponse = await fetch(`${this.chainBaseUrl}account/tokens?chain_id=${networkChainIdMap[network.toLowerCase()]}&contract_address=${tokenAddress}&address=${address}`, options);
            const response =await balanceResponse.json();
            await sleep(500);
            if (response?.message === 'ok' && response.data?.length > 0){
                return BigNumber.from(response.data[0]?.balance).toString();
            }else{
                return "0"
            }
        }catch (error){
            return "0";
        }
    }

    private async getOtherChainNowBlock(network: string){
        try {
            const options = {method: 'GET', headers: {'x-api-key': this.chainBaseKey}} ;
            const transfersResponse = await fetch(`${this.chainBaseUrl}block/number/latest?chain_id=${networkChainIdMap[network.toLowerCase()]}`, options);
            const response = await transfersResponse.json();
            await sleep(500);
            if (response?.code === 0){
                return response.data?.number;
            }else {
                return "networkError" ;
            }
        }catch (error){
            return "networkError" ;
        }
    }

    private async getOtherChainZKLTransfers(tokenAddress: string, fromBlockNumber :string, toBlockNumber :string, network :string){
        try {
            let page = 1;
            const limit = 99;
            let ans = [];
            let pageLimit = 1;
            do {
                const options = {method: 'GET', headers: {'x-api-key': this.chainBaseKey}} ;
                const transfersResponse = await fetch(`${this.chainBaseUrl}token/transfers?chain_id=${networkChainIdMap[network.toLowerCase()]}&contract_address=${tokenAddress}&from_block=${fromBlockNumber}&to_block=${toBlockNumber}&page=${page}&limit=${limit}`, options);
                const response =await transfersResponse.json();
                page = page + 1;
                await sleep(500);
                if (response?.message === 'ok' && response.data?.length > 0){
                    pageLimit = Math.ceil(response.count / limit);
                    for (let i = 0;i<response.data.length;i++){
                        ans.push(response.data[i]);
                    }
                }else{
                    return ans;
                }
            }while (page <= pageLimit);
            return ans ;
        }catch (error){
            this.logger.error(`chainBase api error:${error}`);
            return [];
        }
    }

    private async sendMessageToLarkGroup(from: string, to: string, network: string, value: string, txHash: string) {
        try {
            if (network.toLowerCase() === 'zkLink Nova'.toLowerCase()){

            }else if (network.toLowerCase() === 'Ethereum'.toLowerCase()){

            }
            const message = {
                "msg_type": "interactive",
                "card": {
                    "config": {
                        "wide_screen_mode": true,
                        "enable_forward": true
                    },
                    "header": {
                        "title": {
                            "content": "Alarm for large-amount ZKL transfers.",
                            "tag": "plain_text"
                        }
                    },
                    "elements": [
                        {
                            "tag": "div",
                            "text": {
                                "content": `When a transfer ${txHash} value ${value} is made from ${from} to ${to} in network ${network}, it triggers a high-amount alert.`,
                                "tag": "plain_text"
                            }
                        }
                    ]
                }
            };

            message["chat_id"] = groupId;
            const response = await fetch(this.botUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });
        } catch (error) {
            this.logger.error(`send message error:${error}`);
        }
    }
}