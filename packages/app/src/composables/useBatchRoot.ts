import { ref, computed } from "vue";

import { $fetch, FetchError } from "ohmyfetch";

import useContext from "@/composables/useContext";

export type BatchRootItem = Api.Response.BatchRootItem;

export default (context = useContext()) => {
  const isRequestPending = ref(false);
  const isRequestFailed = ref(false);
  const batchRoot = ref(<BatchRootItem[]>[]);
  const mainBatch = ref(<BatchRootItem>{});

  const getById = async (id: string) => {
    isRequestPending.value = true;
    isRequestFailed.value = false;

    try {
      const response = await $fetch(`${context.currentNetwork.value.apiUrl}/batches/batchroot/${id}`);
      batchRoot.value = response.filter((e: BatchRootItem) => e.chainId !== 5 && e.chainId !== 1);
      mainBatch.value = response.find((e: BatchRootItem) => e.chainId === 5 || e.chainId === 1);
    } catch (error: unknown) {
      batchRoot.value = [];
      if (!(error instanceof FetchError) || error.response?.status !== 404) {
        isRequestFailed.value = true;
      }
    } finally {
      isRequestPending.value = false;
    }
  };

  return {
    getById,
    batchRoot,
    mainBatch,
    isRequestPending,
    isRequestFailed,
  };
};
