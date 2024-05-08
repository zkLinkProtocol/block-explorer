<template>
  <div class="info-field-copy-content">
    <!-- first one is mainnet -->
    <a :href="url" target="_blank">
      <Tooltip class="batches-tooltip">
        <img class="from-chain-icon" src="/img/linea.svg" alt="" />
        <template #content>Linea</template>
      </Tooltip>
    </a>
    <template v-for="(item, i) in filteredIconList" :key="i">
      <a v-if="item?.url" :href="item?.url" target="_blank">
        <Tooltip class="batches-tooltip">
          <img class="from-chain-icon" :src="item?.logoUrl" alt="" />
          <template #content>{{ chainNameList[item?.key!] }}</template>
        </Tooltip>
      </a>
      <Tooltip v-else class="batches-tooltip">
        <img class="from-chain-icon opacity-30" :src="item?.logoUrl" alt="" />
        <template #content>{{ chainNameList[item?.key!] }} </template>
      </Tooltip>
    </template>
  </div>
</template>

<script lang="ts" setup>
import Tooltip from "@/components/common/Tooltip.vue";
export type BatchRootItem = Api.Response.BatchRootItem;
import { computed } from "vue";
import useEnvironmentConfig from "@/composables/useEnvironmentConfig";

const { excuteBatchList, iconsList, chainNameList } = useEnvironmentConfig();

const props = defineProps({
  value: {
    type: String,
    default: "",
    required: true,
  },
  url: {
    type: String,
  },
  batchRoot: {
    type: Array<BatchRootItem>,
    default: [],
  },
  batchNumber:{
    type: String,
    required: true,
  }
});
const iconList = computed(() => {
  return excuteBatchList.map((item) => {
    if (item.chainId) {
      const current = props.batchRoot?.find((r) => r.chainId === item.chainId);
      return {
        ...item,
        ...current,
        url: current?.transactionHash ? `${item.blockExplorersUrl}/tx/${current?.transactionHash}` : "",
        logoUrl: iconsList[item.key!],
      };
    }
  });
});
const filteredIconList = computed(() => {
  const batchNumber=parseInt(props.batchNumber );
  const list = iconList.value || []; 
  if (batchNumber < 2) {
    return list.filter(item => !["zksync", "blast", "optimism", "base"].includes(item?.key!));;
  } else if (batchNumber < 17) {
    return list.filter(item => !['blast','optimism','base'].includes(item?.key!));
  } else {
    return list;
  }
});
</script>

<style lang="scss" scoped>
.info-field-copy-content {
  @apply -my-1 flex gap-x-4 w-full min-w-[6rem]  items-center justify-items-end;
  .from-chain-icon {
    @apply h-7 w-7 rounded-full;
  }
}
</style>
