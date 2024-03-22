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
  const getData = async () => {
    try {
      data.value = await $fetch(`${context.currentNetwork.value.apiUrl}/blocks/total/tvl`);
    } catch (error: unknown) {
      data.value = [];
    }
  };
  return {getData,data};
};
