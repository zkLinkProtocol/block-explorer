import useFetchCollection from "@/composables/common/useFetchCollection";
import useContext from "@/composables/useContext";

import type { NetworkOrigin } from "@/types";
import type { ComputedRef } from "vue";
import { $fetch, FetchError } from "ohmyfetch";
import { ref } from "vue";

export type Holders = {
  balance: string;
  address: string;
  usdPrice?: number;
  totalSupply?: number;
};

export default (context = useContext()) => {
  const loading = ref(false);
  const list = ref<Holders[]>([]);

  const getByAddress = async (address: string) => {
    loading.value = true;
    try {
      const arr = await $fetch(`${context.currentNetwork.value.apiUrl}/tokens/balance/list?page=1&limit=50&tokenAddress=${address}`);
      const updatedList = await Promise.all(
        arr.map(async (item: any) => {
          try {
            const obj = await $fetch(`${context.currentNetwork.value.apiUrl}/tokens/${item.address}`);
            return {
              ...item,
              usdPrice: obj.usdPrice,
              totalSupply: obj.totalSupply,
            };
          } catch (error) {
            console.error(`Error fetching data for address ${item.address}:`, error);
            return {
              ...item,
              usdPrice: null,
              totalSupply: null,
            };
          }
        })
      );
      list.value = updatedList;
    } catch (error: unknown) {
      console.error("Error fetching data:", error);
      list.value = [];
    } finally {
      loading.value = false;
    }
  };

  return {
    getByAddress,
    list,
    loading
  };
};
