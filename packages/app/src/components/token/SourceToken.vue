<template>
  <Table class="table-wrap" :data-testid="$testId.tokensTable" :loading="false" :items="tokens">
    <template #table-head>
      <table-head-column v-for="col in myCols" :key="col.dataIndex">
        {{ col.title }}
      </table-head-column>
    </template>
    <template #table-row="{ item }: { item: any }">
      <TableBodyColumn :data-heading="t('tokensView.sourceToken.tokenName')">
        <TokenIconLabel class="token-name-box" :symbol="item.symbol" icon-size="xl" :address="item.l2Address"
          :name="item.name" :icon-url="item.iconURL" :tags="item.tags" />
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.sourceToken.totalQty')">
        <TotalQTY :totalSupply="item.totalSupply" :decimals="item.decimals" />
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.sourceToken.tvl')">
        <TokenTVL :tvl="item.tvl" />
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.sourceToken.novaAddress')">
        <div class="token-address-container max-w-sm">
          <AddressLink :data-testid="$testId.tokenAddress" :address="item.l2Address"
            class="token-address block max-w-sm">
            {{ shortenFitText(item.l2Address, "left", 100, subtraction) }}
          </AddressLink>
          <CopyButton :value="item.l2Address" />
        </div>
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.sourceToken.originAddress')">
        <div v-if="item.l1Address && !ETH_TOKEN_L1_ADDRESS.includes(item.l1Address)"
          class="token-address-container max-w-sm">
          <div v-if="!item.networkKey">
            {{ shortenFitText(item.l1Address, "left", 100, subtraction) }}
          </div>
          <AddressLink v-else :data-testid="$testId.tokenAddress" :address="item.l1Address" network="origin"
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
import TokenPrice from "@/components/common/table/fields/TokenPrice.vue";
import TokenTVL from "@/components/common/table/fields/TokenTVL.vue";
import TotalQTY from "@/components/common/table/fields/TotalQTY.vue";
import useEnvironmentConfig from "@/composables/useEnvironmentConfig";
import EmptyState from "@/components/common/EmptyState.vue";
import { NOVA_NATIVE_TOKEN, ETH_TOKEN_L1_ADDRESS, NOVA_MERGED_TOKEN } from "@/utils/constants";

import { formatBigNumberish, formatPricePretty } from "@/utils/formatters";

import type { Token } from "@/composables/useToken";

const { chainNameList } = useEnvironmentConfig();

const props = defineProps({
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
.table-wrap {
  :deep(table thead tr th) {
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
