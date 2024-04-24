import useContext from "@/composables/useContext";

import { ref } from "vue";
import { $fetch, FetchError } from "ohmyfetch";
import { types } from "zksync-web3";
export type TVL = {
  id: null | string;
  tvl: null | string;
  timestamp: null | string;
};
export default (context = useContext()) => {
  const data = ref([]);
  let page = 1;
  const getList = async() => {
    const list = await $fetch(`${context.currentNetwork.value.apiUrl}/transactions/dailyTransaction?limit=300&page=${page}`);
    data.value = data.value.concat(list)
    if (data.value.length === (page *300)) {
      page ++
      getList()
    }
  }
  const getData = async (type:string) => {
    page = 1;
    try {
      const url = type === 'TVL'? 'blocks/total/tvl': type === 'UAW'? 'blocks/total/uaw': 'transactions/dailyTransaction?limit=300'
      data.value = await $fetch(`${context.currentNetwork.value.apiUrl}/${url}`);
      if (type === 'Tra' && data.value.length === 300) {
        page ++
        getList()
      }
    } catch (error: unknown) {
      data.value = [];
    }
  };
  return {getData,data};
};
