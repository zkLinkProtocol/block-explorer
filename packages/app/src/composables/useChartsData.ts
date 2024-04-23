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
  const getData = async (type:string) => {
    try {
      const url = type === 'TVL'? 'blocks/total/tvl': type === 'add'? 'blocks/total/uaw': 'transactions/dailyTransaction'
      data.value = await $fetch(`${context.currentNetwork.value.apiUrl}/${url}`);
    } catch (error: unknown) {
      data.value = [];
    }
  };
  return {getData,data};
};
