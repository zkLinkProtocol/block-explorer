<template>
  <Table class="table-wrap" :data-testid="$testId.tokensTable" :loading="false" :items="tokens">
    <template #table-head>
      <table-head-column v-for="col in myCols" :key="col.dataIndex">
        {{ col.title }}
      </table-head-column>
    </template>
    <template #table-row="{ item }: { item: any }">
      <TableBodyColumn :data-heading="t('tokensView.sourceToken.title')">
        <TokenIconLabel class="token-name-box" :symbol="item.symbol" icon-size="xl" :address="item.tokenAddress"
          :name="item.name" :icon-url="item.iconURL" />
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.sourceToken.sourceChain')">
        {{ item.chainName }}
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.sourceToken.mergedQty')">
        {{ formatNumberPretty(Number(item.availableToRedeem)) }}
      </TableBodyColumn>
      <TableBodyColumn  :data-heading="t('tokensView.sourceToken.mergedTVL')">
        <div >{{ formatMoney(Number(Number(item.tvl).toFixed(0)), 0) }}</div>
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.sourceToken.novaAddress')">
        <div class="token-address-container max-w-sm">
          <AddressLink :data-testid="$testId.tokenAddress" :address="item.tokenAddress"
            class="token-address block max-w-sm">
            {{ shortenFitText(item.tokenAddress, "left", 100, subtraction) }}
          </AddressLink>
          <CopyButton :value="item.tokenAddress" />
        </div>
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.sourceToken.originAddress')"> 
        <div v-if="item.l1Address"
          class="token-address-container max-w-sm">
          <AddressLink  :data-testid="$testId.tokenAddress" :address="item.l1Address" network="origin"
            :networkKey="item.networkKey" class="token-address block max-w-sm">
            {{ shortenFitText(item.l1Address, "left", 100, subtraction) }}
          </AddressLink>
          <CopyButton :value="item.l1Address" />
        </div>
        <div v-else class="min-h-[20px]"></div>
      </TableBodyColumn>
    </template>
  </Table>
</template>
<script lang="ts" setup>
import { type PropType, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useElementSize } from "@vueuse/core";

import AddressLink from "@/components/AddressLink.vue";
import TokenIconLabel from "@/components/TokenIconLabel.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { shortenFitText } from "@/components/common/HashLabel.vue";
import Table from "@/components/common/table/Table.vue";
import TableBodyColumn from "@/components/common/table/TableBodyColumn.vue";
import TableHeadColumn from "@/components/common/table/TableHeadColumn.vue";

import { formatMoney, formatNumberPretty } from "@/utils/formatters";

import type { Token } from "@/composables/useToken";
defineProps({
  tokens: {
    type: Array as PropType<Token[]>,
    default: () => [],
  },

});
const { t } = useI18n();
const table = ref(null);
const subtraction = ref(6);
const { width } = useElementSize(table);
watch(width, () => {
  width.value <= 500 ? (subtraction.value = 10) : (subtraction.value = 5);
});
const myCols = ref([
  { title: t("tokensView.sourceToken.title"), dataIndex: "sourceToken" },
  { title: t("tokensView.sourceToken.sourceChain"), dataIndex: "sourceChain" },
  { title: t("tokensView.sourceToken.mergedQty"), dataIndex: "mergedQty" },
  { title: t("tokensView.sourceToken.mergedTVL"), dataIndex: "mergedTVL" },
  { title: t("tokensView.sourceToken.novaAddress"), dataIndex: "novaAddress" },
  { title: t("tokensView.sourceToken.originAddress"), dataIndex: "originAddress" },
]);

</script>

<style scoped lang="scss">
.table-body-col {
  @apply relative flex flex-col items-end justify-end text-right md:table-cell md:w-1/3 md:text-left;

  &:before {
    @apply absolute left-4 top-3 whitespace-nowrap pr-5 text-left text-xs uppercase text-neutral-400 content-[attr(data-heading)] md:content-none;
  }
}

.token-address-container {
  @apply flex gap-x-2;

  .token-address {
    @apply block cursor-pointer font-mono text-sm font-medium;
  }
}

.table-wrap {
  :deep(table thead tr th, ) {
    background-color: transparent;
  }

  :deep(table tbody tr:nth-child(even)) {
    background-color: transparent;
  }
}

.token-name-box {
  :deep(.token-info .token-name) {
    @apply flex-row-reverse md:flex-row;
  }
}

.btn-open {
  @apply flex bg-design-600 text-white rounded px-2 py-1 pr-2.5 text-xs;

  .dropdown-icon {
    @apply w-4 h-4 ml-1;
  }

  &.active {
    .dropdown-icon {
      @apply -rotate-180;
    }
  }

}

</style>
