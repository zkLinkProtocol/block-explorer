<template>
  <Table :data-testid="$testId.tokensTable" :loading="loading" :items="displayTokenList" ref="table">
    <template #table-head>
      <table-head-column @click="sortBy('name')">
        <div class="th-box min-w-16">
          <span>{{ t("tokensView.table.tokenName") }}</span>
          <div class="tool-wrap">
            <ranking :sort-order="getSortOrder('name')" />
            <TableFilterModel
              @click="handleChildClick"
              v-model="searchVal"
              @filter="filter('name')"
              v-model:selected="selectedNameList"
              :filterOptions="symbolOptions"
            />
          </div>
        </div>
      </table-head-column>
      <table-head-column @click="sortBy('price')">
        <div class="th-box">
          <span>{{ t("tokensView.table.price") }}</span>
          <ranking :sort-order="getSortOrder('price')" />
          <span class="px-1">
            <Tooltip class="batches-tooltip">
              <FilterIcon
                @click="toggleShowPrice"
                class="w-4 h-4 text-black cursor-pointer"
                :class="{ 'text-design-200': isZeroPrice }"
              />
              <template #content>
                <span v-if="isZeroPrice">Show Assets Without Price</span>
                <span v-else>Hide Assets Without Price</span>
              </template>
            </Tooltip>
          </span>
        </div>
      </table-head-column>
      <table-head-column @click="sortBy('totalQty')">
        <div class="th-box">
          <span>{{ t("tokensView.table.totalQty") }}</span>
          <ranking :sort-order="getSortOrder('totalQty')" />
        </div>
      </table-head-column>
      <table-head-column @click="sortBy('tvl')">
        <div class="th-box">
          Tvl
          <ranking :sort-order="getSortOrder('tvl')" />
        </div>
      </table-head-column>
      <table-head-column class="text-center" @click="sortBy('fromChain')">
        <div class="th-box">
          <span>{{ t("tokensView.table.fromChain") }}</span>
          <ranking :sort-order="getSortOrder('fromChain')" />
          <TableFilterModel
            @click="handleChildClick"
            v-model:selected="selectedTokenList"
            @filter="filter('chain')"
            :filterOptions="fromChainOptions"
            :isSearch="false"
          />
        </div>
      </table-head-column>
      <table-head-column>{{ t("tokensView.table.novaAddress") }}</table-head-column>
      <table-head-column>{{ t("tokensView.table.originAddress") }}</table-head-column>
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
        <TotalQTY :totalSupply="item.totalSupply" :decimals="item.decimals" />
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.table.tvl')">
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
      <TableBodyColumn :data-heading="t('tokensView.table.novaAddress')">
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
      <TableBodyColumn :data-heading="t('tokensView.table.originAddress')">
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
        <div v-else class="min-h-[20px]"></div>
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
          <ContentLoader />
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
import { type PropType, ref, reactive, watch, computed, type Ref } from "vue";

import { useI18n } from "vue-i18n";

import { useElementSize } from "@vueuse/core";

import AddressLink from "@/components/AddressLink.vue";
import TokenIconLabel from "@/components/TokenIconLabel.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { shortenFitText } from "@/components/common/HashLabel.vue";
import ContentLoader from "@/components/common/loaders/ContentLoader.vue";
import Table from "@/components/common/table/Table.vue";
import TableBodyColumn from "@/components/common/table/TableBodyColumn.vue";
import TableHeadColumn from "@/components/common/table/TableHeadColumn.vue";
import TokenPrice from "@/components/common/table/fields/TokenPrice.vue";
import TokenTVL from "@/components/common/table/fields/TokenTVL.vue";
import TotalQTY from "@/components/common/table/fields/TotalQTY.vue";
import TransactionNetworkSquareBlock from "@/components/transactions/TransactionNetworkSquareBlock.vue";
import Ranking from "./TableRanking.vue";
import TableFilterModel from "./TableFilterModal.vue";
import { FilterIcon } from "@heroicons/vue/outline";
import Tooltip from "@/components/common/Tooltip.vue";
import useEnvironmentConfig from "@/composables/useEnvironmentConfig";

import { formatBigNumberish, formatPricePretty } from "@/utils/formatters";

import { NOVA_NATIVE_TOKEN, ETH_TOKEN_L1_ADDRESS, NOVA_MERGED_TOKEN } from "@/utils/constants";

const { chainNameList } = useEnvironmentConfig();

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
const searchVal = ref<string>("");
const symbolOptions = computed(() => {
  let arr: string[] = [];
  props.tokens.map((item) => {
    arr.push(item.symbol!);
  });
  if (searchVal.value) {
    const newArr = arr.filter((item) => {
      return item.includes(searchVal.value);
    });
    return [...new Set(newArr)];
  } else {
    return [...new Set(arr)];
  }
});
const filter = (flag: string) => {
  if (flag === "name") {
    selectedTokenList.value = [];
  } else if (flag === "chain") {
    selectedNameList.value = [];
  }
};
// filter FROM CHAIN
const selectedTokenList: Ref<string[]> = ref([]);
const selectedNameList: Ref<string[]> = ref([]);
const filterChain = (mergeData: Token[]) => {
  if (selectedTokenList.value.length === 0) {
    return props.tokens;
  }
  return mergeData.filter((item) => {
    const networkName = item.networkKey
      ? chainNameList[item.networkKey]
      : ETH_TOKEN_L1_ADDRESS.includes(item.l1Address!)
      ? NOVA_MERGED_TOKEN
      : NOVA_NATIVE_TOKEN;

    const optionMatch = selectedTokenList.value.includes(networkName);
    return optionMatch;
  });
};
// filter symbol
const filterName = (mergeData: Token[]) => {
  if (selectedNameList.value.length === 0) {
    return props.tokens;
  }
  return mergeData.filter((item) => {
    const optionMatch = selectedNameList.value.includes(item.symbol!);
    return optionMatch;
  });
};
const isZeroPrice = ref<Boolean>(true);
const toggleShowPrice = (e: MouseEvent) => {
  e.stopPropagation();
  isZeroPrice.value = !isZeroPrice.value;
};
const sortKey = ref<string>("");
interface SortRule {
  key: string;
  sortOrder: string; // 可以使用枚举类型来限制排序规则
}
const sortRules = reactive<SortRule[]>([
  { key: "name", sortOrder: "" },
  { key: "price", sortOrder: "" },
  { key: "totalQty", sortOrder: "" },
  { key: "fromChain", sortOrder: "" },
  { key: "tvl", sortOrder: "" },
]);
const sortBy = (column: string) => {
  // Clear other column sort
  sortRules.forEach((r) => {
    if (r.key !== column) {
      r.sortOrder = "";
    }
  });
  const index = sortRules.findIndex((rule) => rule.key === column);
  if (sortKey.value === column && index !== -1) {
    sortRules[index].sortOrder =
      sortRules[index].sortOrder === "asc" ? "desc" : sortRules[index].sortOrder === "desc" ? "" : "asc";
  } else {
    sortKey.value = column;
    sortRules[index].sortOrder = "asc";
  }
};
const compareCharacter = (valueA: string, valueB: string, sortOrder: string): number => {
  if (sortOrder === "asc") {
    return valueA.localeCompare(valueB);
  } else if (sortOrder === "desc") {
    return valueB.localeCompare(valueA);
  } else {
    return 0;
  }
};
const compareValues = (valueA: number, valueB: number, sortOrder: string): number => {
  if (sortOrder === "asc") {
    return valueB - valueA;
  } else if (sortOrder === "desc") {
    return valueA - valueB;
  } else {
    return 0;
  }
};
const displayTokenList = computed(() => {
  let mergeData: Token[] = [...props.tokens];
  // Hide Assets Without Price
  if (isZeroPrice.value) {
    mergeData = [...props.tokens].filter((item) => {
      if (!item.usdPrice) {
        return false;
      }
      const price = +item.usdPrice! * +formatBigNumberish("1".padEnd(item.decimals + 1, "0"), item.decimals);

      return price > 0;
    });
  }
  // filtering
  if (selectedTokenList.value.length === 0 && selectedNameList.value.length === 0) {
    // mergeData = mergeData;
  } else if (selectedTokenList.value.length > 0) {
    mergeData = filterChain(mergeData);
  } else if (selectedNameList.value.length > 0) {
    mergeData = filterName(mergeData);
  }
  // ranking
  if (sortKey.value) {
    // different type
    const targetRule = sortRules.find((rule) => rule.key === sortKey.value);
    const sortOrder = targetRule?.sortOrder ?? "";
    mergeData = [...mergeData].sort((a, b) => {
      let valueA = "";
      let valueB = "";
      if (sortKey.value === "name") {
        valueA = a.symbol!;
        valueB = b.symbol!;
        return compareCharacter(valueA, valueB, sortOrder);
      }
      if (sortKey.value === "price") {
        const valueA = +a.usdPrice! * +formatBigNumberish("1".padEnd(a.decimals + 1, "0"), a.decimals);
        const valueB = +b.usdPrice! * +formatBigNumberish("1".padEnd(b.decimals + 1, "0"), b.decimals);
        return compareValues(valueA, valueB, sortOrder);
      }
      if (sortKey.value === "totalQty") {
        const aVal = parseFloat(formatBigNumberish(a.totalSupply!.hex, a.decimals));
        const bval = parseFloat(formatBigNumberish(b.totalSupply!.hex, b.decimals));
        return compareValues(aVal, bval, sortOrder);
      }
      if (sortKey.value === "tvl") {
        return compareValues(parseFloat(a.tvl), parseFloat(b.tvl), sortOrder);
      }
      if (sortKey.value === "fromChain") {
        valueA = a.networkKey
          ? chainNameList[a.networkKey]
          : ETH_TOKEN_L1_ADDRESS.includes(a.l1Address!)
          ? NOVA_MERGED_TOKEN
          : NOVA_NATIVE_TOKEN;
        valueB = b.networkKey
          ? chainNameList[b.networkKey]
          : ETH_TOKEN_L1_ADDRESS.includes(b.l1Address!)
          ? NOVA_MERGED_TOKEN
          : NOVA_NATIVE_TOKEN;
        return compareCharacter(valueA, valueB, sortOrder);
      }
      return 0;
    });
  }
  return mergeData;
});
const getSortOrder = (column: string) => {
  const index = sortRules.findIndex((r) => r.key === column);
  if (index != -1) {
    return sortRules[index].sortOrder;
  } else {
    return "";
  }
};
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
    text-align: center;
  }
}

.text-center {
  // min-width: 240px;
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

@media (max-width: 760px) {
  .token-icon-label {
    display: flex;
    flex-direction: row-reverse;
  }
}
</style>
<style lang="scss">
.table-container .table-body {
  overflow: unset;
}
</style>
