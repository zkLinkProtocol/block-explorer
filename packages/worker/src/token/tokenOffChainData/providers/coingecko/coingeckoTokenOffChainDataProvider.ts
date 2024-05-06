import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import { setTimeout } from "timers/promises";
import { catchError, firstValueFrom } from "rxjs";
import { utils } from "zksync-web3";
import { TokenOffChainDataProvider, ITokenOffChainData } from "../../tokenOffChainDataProvider.abstract";
import { HttpsProxyAgent } from "https-proxy-agent";

const API_NUMBER_OF_TOKENS_PER_REQUEST = 250;
const API_INITIAL_RETRY_TIMEOUT = 5000;
const API_RETRY_ATTEMPTS = 5;

interface ITokenListItemProviderResponse {
  id: string;
  platforms: Record<string, string>;
}

export interface IExtraTokenAttribute {
  address: string;
  image: string;
  market_cap: number;
}

interface ITokenMarketDataProviderResponse {
  id: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
}

class ProviderResponseError extends Error {
  constructor(message: string, public readonly status: number, public readonly rateLimitResetDate?: Date) {
    super(message);
  }
}

@Injectable()
export class CoingeckoTokenOffChainDataProvider implements TokenOffChainDataProvider {
  private readonly logger: Logger;
  private readonly isProPlan: boolean;
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly platformIds: Array<string>;
  private readonly extraCoinsList: ITokenListItemProviderResponse[];
  private readonly extraTokenAttributes: IExtraTokenAttribute[];
  private readonly proxyUrl: string;
  private readonly enableProxy: boolean;
  private readonly agent: HttpsProxyAgent<string>;

  constructor(configService: ConfigService, private readonly httpService: HttpService) {
    this.logger = new Logger(CoingeckoTokenOffChainDataProvider.name);
    this.isProPlan = configService.get<boolean>("tokens.coingecko.isProPlan");
    this.apiKey = configService.get<string>("tokens.coingecko.apiKey");
    this.apiUrl = this.isProPlan ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
    const _platformIds = configService.get<Array<string>>("tokens.coingecko.platformIds");
    if (_platformIds[0] === "") {
      this.platformIds = [];
    } else {
      this.platformIds = _platformIds;
    }
    this.extraCoinsList = configService.get<ITokenListItemProviderResponse[]>("tokens.coingecko.extraCoinsList");
    this.extraTokenAttributes = configService.get<IExtraTokenAttribute[]>("tokens.coingecko.extraTokenAttributes");

    this.proxyUrl = configService.get<string>("tokens.coingecko.proxyUrl");
    this.enableProxy = configService.get<boolean>("tokens.coingecko.enableProxy");
    if (this.enableProxy) {
      this.agent = new HttpsProxyAgent(this.proxyUrl);
    }
  }

  public async getTokensOffChainData({
    bridgedTokensToInclude,
  }: {
    bridgedTokensToInclude: string[];
  }): Promise<ITokenOffChainData[]> {
    const tokensList = await this.getTokensList();
    // Include ETH, all zksync L2 tokens and bridged tokens
    const supportedTokens = tokensList.filter(
      (token) =>
        token.id === "ethereum" ||
        token.platforms["zklink-nova"] || // unless the nova token is list on coingecko, this will not take effect here
        bridgedTokensToInclude.find((bridgetTokenAddress) =>
          this.isPlatformIncluded(token.platforms, bridgetTokenAddress)
        )
    );

    const tokensOffChainData: ITokenOffChainData[] = [];
    let tokenIdsPerRequest = [];
    for (let i = 0; i < supportedTokens.length; i++) {
      tokenIdsPerRequest.push(supportedTokens[i].id);
      if (tokenIdsPerRequest.length === API_NUMBER_OF_TOKENS_PER_REQUEST || i === supportedTokens.length - 1) {
        const tokensMarkedData = await this.getTokensMarketData(tokenIdsPerRequest);
        for (let tokenMarketData of tokensMarkedData) {
          const token = supportedTokens.find((t) => t.id === tokenMarketData.id);
          if (!token || !tokenMarketData.current_price) {
            // tokenMarketData.current_price maybe null
            continue;
          }
          for (const platform of Object.keys(token.platforms)) {
            if (!token.platforms[platform]) {
              continue;
            }
            const [market_cap, image] = this.getMarketCapAndImage(token.platforms[platform], tokenMarketData);
            if (platform === "zklink-nova") {
              tokensOffChainData.push({
                l1Address: null,
                l2Address: token.platforms["zklink-nova"], // unless the nova token is list on coingecko, this will not take effect here
                liquidity: market_cap,
                usdPrice: tokenMarketData.current_price,
                iconURL: image,
              });
            } else {
              tokensOffChainData.push({
                l1Address: token.platforms[platform],
                l2Address: null,
                liquidity: market_cap,
                usdPrice: tokenMarketData.current_price,
                iconURL: image,
              });
            }
          }
          if (token.id === "ethereum") {
            tokensOffChainData.push({
              l1Address: utils.ETH_ADDRESS,
              l2Address: null,
              liquidity: tokenMarketData.market_cap,
              usdPrice: tokenMarketData.current_price,
              iconURL: tokenMarketData.image,
            });
          }
        }
        tokenIdsPerRequest = [];
      }
    }
    return tokensOffChainData;
  }

  private getTokensMarketData(tokenIds: string[]) {
    return this.makeApiRequestRetryable<ITokenMarketDataProviderResponse[]>({
      path: "/coins/markets",
      query: {
        vs_currency: "usd",
        ids: tokenIds.join(","),
        per_page: tokenIds.length.toString(),
        page: "1",
        locale: "en",
      },
    });
  }
  //if addrss is found in extraCoinsList, return market_cap and image from tokenMarketData
  private getMarketCapAndImage(address: string, tokenMarketData: ITokenMarketDataProviderResponse): [number, string] {
    const extraCoin = this.extraTokenAttributes.find((item) => item.address === address.toLowerCase());
    if (!extraCoin) {
      return [tokenMarketData.market_cap, tokenMarketData.image];
    }
    return [extraCoin.market_cap ?? tokenMarketData.market_cap, extraCoin.image ?? tokenMarketData.image];
  }
  private async getTokensList() {
    const list = await this.makeApiRequestRetryable<ITokenListItemProviderResponse[]>({
      path: "/coins/list",
      query: {
        include_platform: "true",
      },
    });
    if (!list) {
      return [];
    }

    return list
      .filter((item) => item.id === "ethereum" || this.isPlatformSupported(item.platforms))
      .map((item) => {
        const extraCoin = this.extraCoinsList.find((extraCoin) => extraCoin.id === item.id);
        if (extraCoin) {
          item.platforms = { ...item.platforms, ...extraCoin.platforms };
        }
        return {
          ...item,
          platforms: this.rewritePlatformIds(item.platforms),
        };
      });
  }

  private async makeApiRequestRetryable<T>({
    path,
    query,
    retryAttempt = 0,
    retryTimeout = API_INITIAL_RETRY_TIMEOUT,
  }: {
    path: string;
    query?: Record<string, string>;
    retryAttempt?: number;
    retryTimeout?: number;
  }): Promise<T> {
    try {
      return await this.makeApiRequest<T>(path, query);
    } catch (err) {
      if (err.status === 404) {
        return null;
      }
      if (err.status === 429) {
        const rateLimitResetIn = err.rateLimitResetDate.getTime() - new Date().getTime();
        await setTimeout(rateLimitResetIn >= 0 ? rateLimitResetIn + 1000 : 0);
        return this.makeApiRequestRetryable<T>({
          path,
          query,
        });
      }
      if (retryAttempt >= API_RETRY_ATTEMPTS) {
        this.logger.error({
          message: `Failed to fetch data at ${path} from coingecko after ${retryAttempt} retries`,
          provider: CoingeckoTokenOffChainDataProvider.name,
        });
        return null;
      }
      await setTimeout(retryTimeout);
      return this.makeApiRequestRetryable<T>({
        path,
        query,
        retryAttempt: retryAttempt + 1,
        retryTimeout: retryTimeout * 2,
      });
    }
  }
  private isPlatformSupported(platforms: Record<string, string>) {
    return Object.keys(platforms).some((platform) => this.platformIds.includes(platform));
  }

  private isPlatformIncluded(platforms: Record<string, string>, bridgetTokenAddress: string) {
    return Object.values(platforms).includes(bridgetTokenAddress);
  }

  private rewritePlatformIds(platforms: Record<string, string>) {
    return Object.fromEntries(
      Object.entries(platforms)
        .filter(([key, value]) => this.platformIds.includes(key))
        .map(([key, value]) => {
          if (key === "starknet") {
            return [key, value.substring(0, 66)];
          }
          return [key, value.substring(0, 42)];
        })
    );
  }

  private async makeApiRequest<T>(path: string, query?: Record<string, string>): Promise<T> {
    const queryString = new URLSearchParams({
      ...query,
      ...(this.isProPlan
        ? {
            x_cg_pro_api_key: this.apiKey,
          }
        : {
            x_cg_demo_api_key: this.apiKey,
          }),
    }).toString();

    const { data } = await firstValueFrom<{ data: T }>(
      this.httpService
        .get(`${this.apiUrl}${path}?${queryString}`, { httpsAgent: this.enableProxy ? this.agent : undefined })
        .pipe(
          catchError((error: AxiosError) => {
            if (error.response?.status === 429) {
              const rateLimitReset = error.response.headers["x-ratelimit-reset"];
              // use specified reset date or 60 seconds by default
              const rateLimitResetDate = rateLimitReset
                ? new Date(rateLimitReset)
                : new Date(new Date().getTime() + 60000);
              this.logger.debug({
                message: `Reached coingecko rate limit, reset at ${rateLimitResetDate}`,
                stack: error.stack,
                status: error.response.status,
                response: error.response.data,
                provider: CoingeckoTokenOffChainDataProvider.name,
              });
              throw new ProviderResponseError(error.message, error.response.status, rateLimitResetDate);
            }
            this.logger.error({
              message: `Failed to fetch data at ${path} from coingecko`,
              stack: error.stack,
              status: error.response?.status,
              response: error.response?.data,
              provider: CoingeckoTokenOffChainDataProvider.name,
            });
            throw new ProviderResponseError(error.message, error.response?.status);
          })
        )
    );
    return data;
  }
}
