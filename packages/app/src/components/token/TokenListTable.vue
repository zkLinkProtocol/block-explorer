<template>
  <Table :data-testid="$testId.tokensTable" :loading="loading" :items="filteredData" ref="table">
    <template #table-head>
      <table-head-column @click="sortBy('name')">
        <div class="th-box">
          <span>{{ t("tokensView.table.tokenName") }}</span>
          <div class="tool-wrap">
            <ranking :sort-order="sortOrder" />
            <TableFilterModel @click="handleChildClick" />
          </div>
        </div>
      </table-head-column>
      <table-head-column @click="sortBy('price')">
        <div class="th-box">
          <span>{{ t("tokensView.table.price") }}</span>
          <ranking :sort-order="sortOrder" />
        </div>
      </table-head-column>
      <table-head-column>{{ t("tokensView.table.totalQty") }}</table-head-column>
      <table-head-column>
        <div class="th-box">
          Tvl
          <ranking :sort-order="sortOrder" />
        </div>
      </table-head-column>
      <table-head-column class="text-center">
        <div class="th-box">
          <span>{{ t("tokensView.table.fromChain") }}</span>
          <ranking :sort-order="sortOrder" />
          <TableFilterModel @filter="filterChain" :filterOptions="fromChainOptions" :isSearch="false" />
        </div>
      </table-head-column>
      <table-head-column>Nova ADDRESS</table-head-column>
      <table-head-column>Origin Address</table-head-column>
    </template>
    <template #table-row="{ item }: { item: any }">
      <TableBodyColumn :data-heading="t('tokensView.table.tokenName')">
        <TokenIconLabel
          :symbol="item.symbol"
          icon-size="xl"
          :address="item.l2Address"
          :name="item.name"
          :icon-url="item.iconURL"
        />
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.table.price')">
        <TokenPrice :address="item.l2Address" />
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.table.totalQty')">
        <TotalQTY :totalSupply="item.totalSupply" :decimals="item.decimals"/>
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.table.price')">
        <TokenTVL :tvl="item.tvl" />
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.table.fromChain')">
        <div v-if="chainNameList[item.networkKey]" class="from-chain-text">
          {{ chainNameList[item.networkKey] }}
        </div>
        <div v-else-if="ETH_TOKEN_L1_ADDRESS.includes(item.l1Address)" class="from-chain-text">
          {{ NOVA_MERGED_TOKEN }}
        </div>
        <div v-else class="from-chain-text">{{ NOVA_NATIVE_TOKEN }}</div>
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.table.tokenAddress')">
        <div class="token-address-container max-w-sm">
          <!--          <TransactionNetworkSquareBlock network="Nova" />-->
          <AddressLink
            :data-testid="$testId.tokenAddress"
            :address="item.l2Address"
            class="token-address block max-w-sm"
          >
            {{ shortenFitText(item.l2Address, "left", 100, subtraction) }}
          </AddressLink>
          <CopyButton :value="item.l2Address" />
        </div>
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.table.tokenAddress')">
        <div
          v-if="item.l1Address && !ETH_TOKEN_L1_ADDRESS.includes(item.l1Address)"
          class="token-address-container max-w-sm"
        >
          <!--          <TransactionNetworkSquareBlock network="ORIGIN" />-->
          <div v-if="!item.networkKey">
            {{ shortenFitText(item.l1Address, "left", 100, subtraction) }}
          </div>
          <AddressLink
            v-else
            :data-testid="$testId.tokenAddress"
            :address="item.l1Address"
            network="origin"
            :networkKey="item.networkKey"
            class="token-address block max-w-sm"
          >
            {{ shortenFitText(item.l1Address, "left", 100, subtraction) }}
          </AddressLink>
          <CopyButton :value="item.l1Address" />
        </div>
        <div v-else></div>
      </TableBodyColumn>
    </template>
    <template #loading>
      <tr class="loading-row" v-for="row in 5" :key="row">
        <TableBodyColumn>
          <div class="token-icon-label">
            <div class="token-link">
              <div class="token-icon-container xl">
                <div class="token-img-loader"></div>
              </div>
            </div>
            <div class="token-info">
              <div class="token-symbol py-0.5">
                <ContentLoader class="h-4 w-8" />
              </div>
              <div class="token-name py-0.5">
                <ContentLoader class="h-3 w-20" />
              </div>
            </div>
          </div>
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader class="w-16" />
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader />
        </TableBodyColumn>
         <TableBodyColumn>
          <ContentLoader/>
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader />
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader />
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader />
        </TableBodyColumn>
      </tr>
    </template>
  </Table>
</template>
<script lang="ts" setup>
import { type PropType, ref, watch, computed } from "vue";
import { useI18n } from "vue-i18n";

import { useElementSize } from "@vueuse/core";

import AddressLink from "@/components/AddressLink.vue";
import TokenIconLabel from "@/components/TokenIconLabel.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { shortenFitText } from "@/components/common/HashLabel.vue";
import Tooltip from "@/components/common/Tooltip.vue";
import ContentLoader from "@/components/common/loaders/ContentLoader.vue";
import Table from "@/components/common/table/Table.vue";
import TableBodyColumn from "@/components/common/table/TableBodyColumn.vue";
import TableHeadColumn from "@/components/common/table/TableHeadColumn.vue";
import TokenPrice from "@/components/common/table/fields/TokenPrice.vue";
import TokenTVL from "@/components/common/table/fields/TokenTVL.vue";
import IconArrowDown from "@/components/icons/IconArrowDown.vue";
import IconArrowUp from "@/components/icons/IconArrowUp.vue";
import TotalQTY from "@/components/common/table/fields/TotalQTY.vue"
import TransactionNetworkSquareBlock from "@/components/transactions/TransactionNetworkSquareBlock.vue";
import Ranking from "./TableRanking.vue";
import TableFilterModel from "./TableFilterModal.vue";
// import { iconList } from "@/configs/hyperchain.config.json"
import useEnvironmentConfig from "@/composables/useEnvironmentConfig";

import { NOVA_NATIVE_TOKEN, ETH_TOKEN_L1_ADDRESS, NOVA_MERGED_TOKEN } from "@/utils/constants";

const { iconsList, chainNameList } = useEnvironmentConfig();

import type { Token } from "@/composables/useToken";

const props = defineProps({
  tokens: {
    type: Array as PropType<Token[]>,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: true,
  },
});

const { t } = useI18n();
const table = ref(null);
const subtraction = ref(6);
const { width } = useElementSize(table);
watch(width, () => {
  width.value <= 500 ? (subtraction.value = 10) : (subtraction.value = 5);
});
const handleChildClick = (e: MouseEvent) => {
  e.stopPropagation();
};

const fromChainOptions = computed((): string[] | [] => {
  return [NOVA_MERGED_TOKEN, NOVA_NATIVE_TOKEN, ...Object.values(chainNameList)];
});
const filterChain = (selectedList) => {
  filteredData.value = props.tokens.filter((item) => {
    const networkName = item.networkKey
      ? chainNameList[item.networkKey]
      : ETH_TOKEN_L1_ADDRESS.includes(item.l1Address)
      ? NOVA_MERGED_TOKEN
      : NOVA_NATIVE_TOKEN;

    const optionMatch = selectedList.value.includes(networkName);
    return optionMatch;
  });
};
const sortColumn = ref<string>("");

const sortType = ref<string>("value");
const sortOrder = ref<string>("");

const sortedData = computed(() => {
  if (sortColumn.value && sortOrder.value) {
    return [...props.tokens].sort((a, b) => {
      const key = sortColumn.value as keyof Token;
      const valueA = a[key]!;
      const valueB = b[key]!;
      if (sortOrder.value === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else if (sortOrder.value === "desc") {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      } else {
        return 0;
      }
    });
  } else {
    return props.tokens;
  }
});

function sortBy(column: string) {
  if (sortColumn.value === column) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : sortOrder.value === "desc" ? "none" : "asc";
  } else {
    sortColumn.value = column;
    sortOrder.value = "asc";
  }
}
</script>

<style scoped lang="scss">
.table-body-col {
  @apply relative flex flex-col items-end justify-end text-right md:table-cell md:w-1/3 md:text-left;
  &:before {
    @apply absolute left-4 top-3 whitespace-nowrap pr-5 text-left text-xs uppercase text-neutral-400 content-[attr(data-heading)] md:content-none;
  }

  .token-address-container {
    @apply flex gap-x-2;

    .token-address {
      @apply block cursor-pointer font-mono text-sm font-medium;
    }
  }

  .loading-row {
    .content-loader {
      @apply w-full;
    }
  }

  .tokens-not-found {
    @apply px-1.5 py-2 text-gray-700;
  }

  .from-chain-icon {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    overflow: hidden;
    margin: 0 auto;
  }

  .from-chain-text {
    // text-align: center;
  }
}

.text-center {
  min-width: 240px;
  // @apply flex items-center justify-center;
}
.filter-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  cursor: pointer;
  .active {
    @apply text-design-200;
  }
}
.th-box {
  display: flex;
  flex: auto;
  align-items: center;
  justify-content: left;
}
.tool-wrap {
  @apply flex items-center;
}
</style>
