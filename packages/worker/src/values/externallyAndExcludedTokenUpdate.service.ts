import {forwardRef, Injectable, Logger} from "@nestjs/common";
import waitFor from "../utils/waitFor";
import { Worker } from "../common/worker";
import {
    TokenRepository
} from "../repositories";
import { ConfigService } from "@nestjs/config";

export interface IExcludedToken {
    address: string;
    l1Address: string;
    name: string;
    network: string;
}

@Injectable()
export class ExternallyAndExcludeTokenUpdateService extends Worker {
    private readonly excludeTokenList: IExcludedToken[];
    private readonly externallyTokenList: IExcludedToken[];
    private readonly logger: Logger;
    configService: ConfigService;
    public constructor(
        private readonly tokenRepository:TokenRepository,
        configService: ConfigService
    ) {
        super();
        this.excludeTokenList = configService.get<IExcludedToken[]>("tokens.excludeCoinsList");
        this.externallyTokenList = configService.get<IExcludedToken[]>("tokens.externallyCoinsList");
        this.logger = new Logger(ExternallyAndExcludeTokenUpdateService.name);
    }

    protected async runProcess(): Promise<void> {
        try {
            await this.updateExternallyAndExcludedToken();
        } catch (err) {
            this.logger.error({
                message: "Failed to update externally and excluded token data",
                originalError: err,
            });
        }
    }

    private async updateExternallyAndExcludedToken(): Promise<void> {
        const excludeTokenList = this.excludeTokenList;
        const externallyTokenlist = this.externallyTokenList;
        // update tokens isExcluded is true where token l2Address is in excludeTokenList address
        for (const token of excludeTokenList) {
            await this.tokenRepository.updateTokenIsExclude(token.address);
        }
        // update externally tokens information from externallyCoinList.json
        for (const token of externallyTokenlist) {
            await this.tokenRepository.updateTokenIsExternally(token.address,token.network,token.l1Address);
        }
    }
}