import { ref } from "vue";
// import useFetch from "./common/useFetch";
import { $fetch, FetchError } from "ohmyfetch";
import useContext from "./useContext";

export interface NetworkTVL {
  l2Address: string;
  l1Address: string;
  symbol: string;
  name: string;
  decimals: number;
  iconURL: string;
  liquidity: number;
  usdPrice: number;
  tvl: string;
}

// export default (context = useContext()) => {
//   return useFetch<NetworkTVL>(() => new URL(`${context.currentNetwork.value.apiUrl}/tokens/tvl?isall=false`));
// };
export default (context = useContext()) => {
  const isRequestPending = ref(false);
  const isRequestFailed = ref(false);
  const networkTVLList = ref(<NetworkTVL[]>[]);
  const tvl = ref<number>(0);

  const getTVL = async () => {
    isRequestPending.value = true;
    isRequestFailed.value = false;

    try {
      networkTVLList.value = await $fetch(`${context.currentNetwork.value.apiUrl}/tokens/tvl?isall=false`);
      tvl.value = networkTVLList.value[0].tvl ? parseFloat(networkTVLList.value[0].tvl) : 0;
    } catch (error: unknown) {
      networkTVLList.value = [];
      if (!(error instanceof FetchError) || error.response?.status !== 404) {
        isRequestFailed.value = true;
      }
    } finally {
      isRequestPending.value = false;
    }
  };

  return {
    getTVL,
    tvl,
    networkTVLList,
    isRequestPending,
    isRequestFailed,
  };
};
