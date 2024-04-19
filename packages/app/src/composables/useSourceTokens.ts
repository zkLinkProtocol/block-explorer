import { sourceTokens, type SourceTokenBalanceItem } from "@/configs/tokens";
import { MERGE_TOKEN_PORTAL } from "@/utils/constants";
import useAddress, { type Account, type Contract } from "@/composables/useAddress";

const { item, isRequestPending: pending, isRequestFailed: failed, getByAddress } = useAddress();

export default () => {
  const getSourceTokenList = async () => {
    //通过接口拿到数据
    await getByAddress(MERGE_TOKEN_PORTAL);
    console.log("1", item);

    // const { balances: mergeTokenBalances } = await getMergeTokenBalanceFromExplorer();

    // const tokens = sourceTokens.map((token) => {
    //   const sourceToken: SourceToken = {
    //     ...token,
    //     decimals: 0,
    //     balance: 0,
    //     availableToRedeem: 0,
    //   };

    //   const findSourceToken = explorerTokenItems.find(
    //     (item) => item.l2Address.toLowerCase() === token.tokenAddress.toLowerCase()
    //   );
    //   if (findSourceToken) {
    //     sourceToken.decimals = Number(findSourceToken.decimals) || 0;
    //   }

    //   if (findSourceToken?.decimals) {
    //     const findBalance = balanceList.find((item) => item.tokenAddress === token.tokenAddress)?.balance;
    //     if (findBalance) {
    //       sourceToken.balance = Number(formatUnits(findBalance, sourceToken.decimals)) || 0;
    //     }

    //     const availableToRedeem = mergeTokenBalances[sourceToken?.tokenAddress];
    //     if (availableToRedeem) {
    //       sourceToken.availableToRedeem =
    //         Number(formatUnits(BigInt(availableToRedeem.balance), sourceToken.decimals)) || 0;
    //     }
    //   }

    //   return sourceToken;
    // });
  };
  return {
    getSourceTokenList,
  };
};
