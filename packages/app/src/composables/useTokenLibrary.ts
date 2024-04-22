import { ref } from "vue";

import { useMemoize } from "@vueuse/core";
import { $fetch } from "ohmyfetch";

import useFetchCollection from "@/composables/common/useFetchCollection";
import useContext, { type Context } from "@/composables/useContext";
import { ETH_TOKEN_L1_ADDRESS } from "@/utils/constants";

const retrieveTokens = useMemoize(
  async (context: Context): Promise<Api.Response.Token[]> => {
    const tokens = [];
    const tokensParams = {
      ...(context.currentNetwork.value.tokensMinLiquidity != null && {
        minLiquidity: context.currentNetwork.value.tokensMinLiquidity.toString(),
      }),
      limit: "300",
    };
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const tokensResponse = await $fetch<Api.Response.Collection<Api.Response.Token>>(
        `${context.currentNetwork.value.apiUrl}/tokens?${new URLSearchParams(tokensParams).toString()}&page=${page}`
      );
      tokens.push(...tokensResponse.items);
      page++;
      hasMore = !!tokensParams.minLiquidity && tokensResponse.meta.totalPages > tokensResponse.meta.currentPage;
    }

    return tokens;
  },
  {
    getKey(context: Context) {
      return context.currentNetwork.value.name;
    },
  }
);

export default (context = useContext()) => {
  const isRequestPending = ref(false);
  const isRequestFailed = ref(false);
  const tokens = ref<Api.Response.Token[]>([]);
  const tokensWithTag = ref<Api.Response.Token[]>([]);
  const sortTokens = ref<Api.Response.Token[]>([]);
  const getToken = (tokenAddress: string) => tokens.value.find((token) => token.l2Address === tokenAddress);

  const getTokens = async () => {
    isRequestPending.value = true;
    isRequestFailed.value = false;
    try {
      tokens.value = await retrieveTokens(context);
      const ethToken = tokens.value.filter((e) => e.l1Address === ETH_TOKEN_L1_ADDRESS);
      const noEthToken = tokens.value
        .filter((token) => token.l1Address !== ETH_TOKEN_L1_ADDRESS)
        .sort((a, b) => parseFloat(b.tvl) - parseFloat(a.tvl));

      sortTokens.value = [...ethToken, ...noEthToken];
      
      tokensWithTag.value=tokens.value.map((item)=>{
        const novaAddresses = [
          "0x2F8A25ac62179B31D62D7F80884AE57464699059",
          "0xDa4AaEd3A53962c83B35697Cd138cc6df43aF71f",
          "0x1a1A3b2ff016332e866787B311fcB63928464509",
          "0xF573fA04A73d5AC442F3DEa8741317fEaA3cDeab"
          ];
        let tags:string[]=[]
        if(item.networkKey){
          tags.push('Bridged');
        }else{
          //Eth
          if((item.l1Address && ETH_TOKEN_L1_ADDRESS.includes(item.l1Address))){
            tags=['Merged','Bridged']
          }else if((item.l2Address && novaAddresses.includes(item.l2Address))){
            tags=['Merged','Native']
          }else{
            tags=['Native']
          }
        }
        return {
          ...item,
          tags,
        };
      })
      

    } catch {
      isRequestFailed.value = true;
    } finally {
      isRequestPending.value = false;
    }
    return false;
  };
  const getTokensByPagination = ()=>{
     return useFetchCollection<Api.Response.Token>(
       new URL(`/tokens?`, context.currentNetwork.value.apiUrl)
     );

  }

  return {
    isRequestPending,
    isRequestFailed,
    tokens,
    sortTokens,
    tokensWithTag,
    getToken,
    getTokens,
    getTokensByPagination,
  };
};
