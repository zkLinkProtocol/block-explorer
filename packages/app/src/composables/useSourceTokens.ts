import { ref } from "vue";
import { sourceTokens, type SourceTokenBalanceItem, type SourceToken } from "@/configs/tokens";
import { MERGE_TOKEN_PORTAL } from "@/utils/constants";
import useAddress, { type Account, type Contract } from "@/composables/useAddress";
import { formatBigNumberish, formatValue } from "@/utils/formatters";
import useTokenLibrary from "@/composables/useTokenLibrary";
import useContext from "./useContext";

const { item: mergeTokenBalances, isRequestPending: pending, isRequestFailed: failed, getAddress } = useAddress();
const { tokens, getTokens } = useTokenLibrary();
export default (context = useContext()) => {
  const sourceTokenList = ref<SourceToken[] | null>(null);
  const getSourceTokenList = async () => {
    try {
      await getAddress(MERGE_TOKEN_PORTAL);
      await getTokens();
      sourceTokenList.value = sourceTokens.map((token) => {
        const sourceToken: SourceToken = {
          ...token,
          decimals: 0,
          balance: 0,
          availableToRedeem: 0,
        };

        const findSourceToken = tokens.value.find(
          (item) => item.l2Address.toLowerCase() === token.tokenAddress.toLowerCase()
        );
        if (findSourceToken) {
          sourceToken.decimals = Number(findSourceToken.decimals) || 0;
          sourceToken.name = findSourceToken.name || "";
          sourceToken.l1Address = findSourceToken.l1Address || "";
          sourceToken.networkKey = findSourceToken.networkKey || "";
        }
        const availableToRedeem = mergeTokenBalances.value?.balances[sourceToken?.tokenAddress];
        if (availableToRedeem) {
          sourceToken.availableToRedeem = Number(formatValue(availableToRedeem.balance, sourceToken.decimals)) || 0;
        }

        return sourceToken;
      });
    } catch (error) {
      console.error("Error fetching source token list:", error);
    }
  };
  return {
    sourceTokenList,
    getSourceTokenList,
  };
};
