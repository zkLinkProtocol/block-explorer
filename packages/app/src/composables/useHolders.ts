import useFetchCollection from "@/composables/common/useFetchCollection";
import useContext from "@/composables/useContext";

import type { NetworkOrigin } from "@/types";
import type { ComputedRef } from "vue";
import { $fetch, FetchError } from "ohmyfetch";
import { ref } from "vue";
import {BigNumber} from "ethers";

export type Holders = {
  balance: string;
  address: string;
  usdPrice?: number;
  totalSupply?: number;
};

export default (context = useContext()) => {
  const loading = ref(false);
  const isAll = ref(false);
  const list = ref<Holders[]>([]);

  const getByAddress = async (address: string,page: number) => {
    loading.value = true;
    try {
      const arr = await $fetch(`${context.currentNetwork.value.apiUrl}/tokens/balance/list?page=${page}&limit=50&tokenAddress=${address}`);
      const updatedList = await Promise.all(
        arr.map(async (item: any) => {
          try {
            const obj = await $fetch(`${context.currentNetwork.value.apiUrl}/tokens/${item.address}`);
            return {
              ...item,
              usdPrice: obj.usdPrice,
              totalSupply: BigNumber.from(obj.totalSupply.hex).toNumber(),
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
      console.log(updatedList.length)
      if (updatedList.length < 50) {
        isAll.value = true
      }
      if (page === 1) {
        list.value = updatedList;
      } else {
        list.value = [...list.value, ...updatedList];
      }
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
    loading,
    isAll
  };
};
