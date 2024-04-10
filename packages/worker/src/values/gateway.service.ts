import { Injectable, Logger } from "@nestjs/common";
import waitFor from "../utils/waitFor";
import { Worker } from "../common/worker";
import {
    TransactionRepository,
    TransferRepository,
} from "../repositories";
import {ConfigService} from "@nestjs/config";
import {Contract, ethers, providers} from "ethers";
import {CONTRACT_INTERFACES} from "../constants";
import {In} from "typeorm";
@Injectable()
export class GatewayService extends Worker {
    private readonly updateGateWayInterval: number;
    private readonly logger: Logger;
    private readonly primaryChainMainContract: string;
    private readonly primaryChainRpcUrl: string;
    configService: ConfigService;
    public constructor(
        private readonly transferRepository: TransferRepository,
        private readonly transactionRepository:TransactionRepository,
        configService: ConfigService
    ) {
        super();
        this.updateGateWayInterval = 24 * 60 * 60 * 1000;
        this.logger = new Logger(GatewayService.name);
        this.primaryChainMainContract = configService.get<string>("primaryChainMainContract");
        this.primaryChainRpcUrl = configService.get<string>("primaryChainRpcUrl");
    }

    protected async runProcess(): Promise<void> {
        try {
            await this.recordGateWayAndNetworkkey();
        } catch (err) {
            this.logger.error({
                message: "Failed to update transaction gateway and network",
                originalError: err,
            });
        }

        await waitFor(() => !this.currentProcessPromise, this.updateGateWayInterval);
        if (!this.currentProcessPromise) {
            return;
        }

        return this.runProcess();
    }

    private async recordGateWayAndNetworkkey(): Promise<void> {
        const resTransfers = await this.transferRepository.find({ where:{ gateway: In(["error","0x"])} });

        if (resTransfers!== null && resTransfers.length > 0){
            for (let i = 0; i < resTransfers.length; i++){
                const transfer = resTransfers[i];
                let getterContract: Contract = null;
                const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
                const ERROR_GATEWAY = "error";

                const primaryChainMainContract = this.primaryChainMainContract;
                const primaryChainRpcUrl = this.primaryChainRpcUrl;
                if (!getterContract) {
                    getterContract = new ethers.Contract(
                        primaryChainMainContract,
                        CONTRACT_INTERFACES.GETTERS_FACET.abi,
                        new providers.JsonRpcProvider(primaryChainRpcUrl)
                    );
                }
                let gateway: string;
                try {
                    gateway = (await getterContract.getSecondaryChainOp(transfer.transactionHash))["gateway"];
                    if (gateway === EMPTY_ADDRESS) {
                        gateway = null;
                    }
                } catch {
                    gateway = ERROR_GATEWAY;
                }
                await this.transferRepository.updateTransfer(
                    transfer.number,
                    gateway
                );
                await this.transactionRepository.updateGateWay(
                    transfer.transactionHash,
                    gateway
                );

            }
        }
    }
}