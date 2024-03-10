import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import { TokenRepository,BalanceRepository,ReferralsRepository,TvlRepository } from "../repositories";
import {TokenOffChainDataProvider} from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import {TokenService} from "../token/token.service";


@Injectable()
export class StatisticsTvlService extends Worker {
    private readonly statisticsTvlInterval: number;
    private readonly logger: Logger;

    public constructor(
        private readonly tokenService: TokenService,
        private readonly balanceRepository: BalanceRepository,
        private readonly tokenRepository: TokenRepository,
        private readonly referrerRepository: ReferralsRepository,
        private readonly tvlRepository: TvlRepository,
        private readonly tokenOffChainDataProvider: TokenOffChainDataProvider,
        configService: ConfigService
    ) {
        super();
        this.statisticsTvlInterval = configService.get<number>("points.pointsStatistsTvlInterval");
        this.logger = new Logger("Statistics");
    }

    protected async runProcess(): Promise<void> {
        let nextUpdateTimeout = this.statisticsTvlInterval;
        try {
            const lastUpdatedAt = await this.tvlRepository.getLastUpdatedAt();
            const now = new Date().getTime();
            const timeSinceLastUpdate = lastUpdatedAt ? now - lastUpdatedAt.getTime() : this.statisticsTvlInterval;
            nextUpdateTimeout =
                timeSinceLastUpdate >= this.statisticsTvlInterval
                    ? 0
                    : this.statisticsTvlInterval - timeSinceLastUpdate;

            if (!nextUpdateTimeout) {
                let tokens = [];
                let supportTokens = await this.tokenService.getAllSupportTokens();
                for (const t of supportTokens) {
                    for (const addr of t.address) {
                        tokens.push({
                            symbol: t.symbol,
                            chain: addr.chain,
                            l2Address: addr.l2Address,
                            priceId: t.cgPriceId,
                            });
                    }
                }
                const tokenIds = tokens.map(t => t.priceId);
                let tokenPrices = await this.tokenOffChainDataProvider.getTokensCurrentPrice(tokenIds);
                const addresses = await this.balanceRepository.getAllAddresses();
                let addressTokenTvls = new Map();
                let addressTvls = new Map();
                for (const address of addresses) {
                    let balances = await this.balanceRepository.getAccountBalances(address);
                    let addressTokenBalances = [];
                    let addressTotalBalance = 0;
                    for (const token of tokens) {
                        let balancesOfToken = balances.filter(b => {
                            let tokenAddress = `0x${Buffer.from(b.tokenAddress).toString("hex")}`;
                            return token.l2Address == tokenAddress;
                        });
                        if (!balancesOfToken || balancesOfToken.length == 0) {
                            continue;
                        }
                        let tokenPrice = tokenPrices.find(p => p.priceId == token.priceId);
                        let tokenDecimals = Math.pow(10,token.decimals);
                        let balance = 0;
                        for (const balanceOfToken of balancesOfToken) {
                            balance += Number(balanceOfToken.balance)/tokenDecimals;
                        }
                        let usdBalance = balance * tokenPrice.usdPrice;
                        let addressTokenTvl =  {
                            address: address,
                            tokenAddress:Buffer.from(token.l2Address.startsWith("0x") ? token.l2Address.substring(2) : token.l2Address, "hex"),
                            balance: balance,
                            tvl: usdBalance,
                        };
                        addressTokenBalances.push(addressTokenTvl);
                        addressTotalBalance += usdBalance;
                    }
                    let addressTvl = {
                        address: address,
                        tvl: addressTotalBalance,
                        referralTvl: 0,
                    };
                    addressTokenTvls.set(address,addressTokenBalances);
                    addressTvls.set(address,addressTvl);
                }

                // calc group tvl
                let groupTvls = new Map();
                let groupIds = await this.referrerRepository.getAllGroups();
                for (const groupId of groupIds) {
                   let tvl = 0;
                   let members = await this.referrerRepository.getGroupMembers(groupId);
                   for (const member of members) {
                       tvl += addressTvls.get(member)?.tvl||0;
                   }
                   let ethPrice = tokenPrices.find(t => t.priceId === "ethereum");
                   tvl /= ethPrice.usdPrice;
                   let groupTvl = {
                       groupId: groupId,
                       tvl: tvl,
                   }
                   groupTvls.set(groupId,groupTvl);
                }

                // calc referrals tvl
                for (const address of addresses) {
                    let referralTvl = 0;
                    let referees = await this.referrerRepository.getReferralsByAddress(address, 2147483647);
                    for (const r of referees) {
                        referralTvl += addressTvls.get(r);
                    }
                    let ethPrice = tokenPrices.find(t => t.priceId === "ethereum");
                    referralTvl /= ethPrice.usdPrice;
                    let addressTvl = addressTvls.get(address);
                    let newAddressTvl = {
                        address: addressTvl.address,
                        tvl: addressTvl.tvl,
                        referralTvl: referralTvl,
                    };
                    addressTvls.set(address, newAddressTvl);
                }

                const updatedAt = new Date();
                //todo: process in batch
                for (const [address,tokenTvl] of addressTokenTvls) {
                    await this.tvlRepository.upsertTokenTvls(tokenTvl);
                }

                for (const [address,tvl] of addressTvls) {
                    await this.tvlRepository.upsertAddressTvls(tvl);
                }

                for (const [groupId,tvl] of groupTvls) {
                    await this.tvlRepository.upsertGroupTvls(tvl);
                }

                nextUpdateTimeout = this.statisticsTvlInterval;
            }
        } catch (err) {
            this.logger.error({
                message: "Failed to statistics tvl",
                originalError: err,
            });
            nextUpdateTimeout = this.statisticsTvlInterval;
        }

        await waitFor(() => !this.currentProcessPromise, nextUpdateTimeout);
        if (!this.currentProcessPromise) {
            return;
        }

        return this.runProcess();
    }
}
