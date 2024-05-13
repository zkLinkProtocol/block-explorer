<template>
  <div class="flex flex-col md:flex-row items-center justify-between mb-4">
    <TabGroup :selectedIndex="selectedTab" @change="changeTab">
      <TabList class="inline-flex space-x-1 p-1">
        <Tab v-for="tab in tabs" as="template" :key="tab.id" v-slot="{ selected }">
          <button :class="[
      'w-auto rounded-md px-2 md:px-4 py-1 text-sm font-medium leading-5',
      'ring-white/60 ring-offset-2 ring-offset-blue-400 ',
      selected
        ? 'bg-design-900 text-white shadow'
        : 'bg-design-800 text-design-700  text-blue-100 hover:bg-design-900 hover:text-white',
    ]">
            {{ tab.name }}
          </button>
        </Tab>
      </TabList>
    </TabGroup>
    <div class="flex items-center text-sm my-4 md:my-0">
      <FilterModal v-model:selected="selectedFilterList">
      </FilterModal>
      <form v-show="!showClearButton" class="search-form" autocomplete="off" @submit.prevent="handleSearch">
        <search-field v-model:value="searchValue" :placeholder="t('tokensView.search.placeholder')"
          :pending="isRequestPending">
          <template #submit>
            <button class="submit-icon" type="submit">
              <SearchIcon aria-hidden="true" />
            </button>
          </template>
        </search-field>
      </form>
      <div v-show="showClearButton" class="search-result">
        <div class="flex">
          <span>Filter by Token </span>
          <span class="search-key">{{ searchValue }}</span>
        </div>
        <button @click="handleClear" class="btn-close">
          <XIcon />
        </button>
      </div>
    </div>

  </div>
  <Table class="table-wrap" :data-testid="$testId.tokensTable" :loading="localLoading" :items="displayTokenList"
    ref="table" :expandable="expandable">
    <template #table-head>
      <table-head-column>
        <span>{{ t("tokensView.table.tokenName") }}</span>
      </table-head-column>
      <table-head-column>
        <span>{{ t("tokensView.table.price") }}</span>
      </table-head-column>
      <table-head-column>
        <span>{{ t("tokensView.table.totalQty") }}</span>
      </table-head-column>
      <table-head-column @click="sortBy('tvl')">
        <div class="th-box min-w-[8rem]">
          {{ t("tokensView.table.tvl") }}
          <ranking :sort-order="sortOrder" />
        </div>
      </table-head-column>
      <table-head-column v-if="selectedTab === TAB_TYPE.Bridged || selectedTab === TAB_TYPE.Externally">
        <div class="th-box">
          <span>{{ t("tokensView.table.sourceChain") }}</span>
          <TableFilterModel @click="handleChildClick" v-model:selected="selectedTokenList"
            :filterOptions="fromChainOptions" :isSearch="false" />
        </div>
      </table-head-column>
      <table-head-column>{{ t("tokensView.table.novaAddress") }}</table-head-column>
      <table-head-column v-if="selectedTab !== TAB_TYPE.Native && selectedTab !== TAB_TYPE.Externally">
        <span v-if="selectedTab !== TAB_TYPE.Merged">{{ t("tokensView.table.originAddress") }}</span>
        <div v-else class="min-h-[20px]"></div>
      </table-head-column>
    </template>
    <template #table-row="{ item }: { item: any }">
      <TableBodyColumn :data-heading="t('tokensView.table.tokenName')">
        <TokenIconLabel class="token-name-box" :symbol="item.symbol" icon-size="xl" :address="item.l2Address"
          :name="item.name" :icon-url="item.iconURL" :decimals="item.decimals" :showMask="true" />
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
      <TableBodyColumn v-if="selectedTab === TAB_TYPE.Bridged||selectedTab === TAB_TYPE.Externally" :data-heading="t('tokensView.table.sourceChain')">
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
          <AddressLink :data-testid="$testId.tokenAddress" :address="item.l2Address"
            class="token-address block max-w-sm">
            {{ shortenFitText(item.l2Address, "left", 100, subtraction) }}
          </AddressLink>
          <CopyButton :value="item.l2Address" />
        </div>
      </TableBodyColumn>
      <TableBodyColumn v-if="selectedTab === TAB_TYPE.Bridged" :data-heading="t('tokensView.table.originAddress')">
        <div v-if="item.l1Address && !ETH_TOKEN_L1_ADDRESS.includes(item.l1Address)"
          class="token-address-container max-w-sm">
          <!--          <TransactionNetworkSquareBlock network="ORIGIN" />-->
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
    <template #expand-button="{ item, index, active }">
      <button :class="{ 'btn-open': true, active }">
        Source Tokens ({{ item.matchingTokens.length }})
        <ChevronDownIcon class="dropdown-icon" aria-hidden="true" />
      </button>

    </template>
    <template #table-row-expanded="{ item }: { item: any }">
      <td colspan="6">
        <SourceToken :items="item.matchingTokens" />
      </td>

    </template>

    <template #empty>
      <tr>
        <TableBodyColumn class="empty-state-container" colspan="7">
          <EmptyState class="empty-state">
            <template #title>
              <span class="font-normal">There are no matching entries for:</span>
              <span v-if="searchValue" class="font-bold">'{{ searchValue }}'</span>
            </template>
            <template #description><span></span></template>
          </EmptyState>
        </TableBodyColumn>
      </tr>
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
        <TableBodyColumn v-if="selectedTab === TAB_TYPE.Bridged">
          <ContentLoader />
        </TableBodyColumn>
        <TableBodyColumn v-if="selectedTab === TAB_TYPE.Bridged">
          <ContentLoader />
        </TableBodyColumn>
      </tr>
    </template>
  </Table>
</template>
<script lang="ts" setup>
import { type PropType, ref, watch, computed, onBeforeUnmount, type Ref } from "vue";

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
import useEnvironmentConfig from "@/composables/useEnvironmentConfig";
import { TabGroup, TabList, Tab, } from '@headlessui/vue'
import SearchField from "@/components/common/SearchField.vue";
import Button from "@/components/common/Button.vue";
import FilterModal from './FilterModal.vue'
import EmptyState from "@/components/common/EmptyState.vue";
import SourceToken from "./SourceToken.vue"
import { XIcon, ChevronDownIcon } from "@heroicons/vue/outline";
import useSourceTokens from '@/composables/useSourceTokens'
import { SearchIcon } from "@heroicons/vue/outline";



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

const { sourceTokenList, getSourceTokenList } = useSourceTokens()

getSourceTokenList()

const handleChildClick = (e: MouseEvent) => {
  e.stopPropagation();
};

const isRequestPending = ref(false);

enum TAB_TYPE {
  Merged,
  Native,
  Externally,
  Bridged
};
const selectedTab = ref(TAB_TYPE.Merged);
const expandable = computed(() => {
  return selectedTab.value === TAB_TYPE.Merged
})
function changeTab(index: number) {
  selectedTab.value = index;
}
const searchValue = ref("");
const showClearButton = ref(false);
const isSearchVal = ref("")
const handleSearch = async () => {
  if (!searchValue.value) return
  isSearchVal.value = searchValue.value
  showClearButton.value = true;
};
const handleClear = () => {
  showClearButton.value = false;
  searchValue.value = '';
  isSearchVal.value = '';

}
const fromChainOptions = computed((): string[] | [] => {
  return [NOVA_MERGED_TOKEN, ...Object.values(chainNameList)];
});
interface Tab {
  id: string;
  name: string;
}

const tabs: Tab[] = [
  { id: 'merged', name: 'Merged Tokens' },
  { id: 'native', name: 'Natively Minted' },
  { id: 'externally', name: 'Externally Bridged' },
  { id: 'bridged', name: 'Canonically Bridged' },
];

// filter FROM CHAIN
const selectedTokenList: Ref<string[]> = ref([]);
const selectedFilterList: Ref<string[]> = ref(['price']);
const filterChain = (mergeData: Token[]) => {
  if (selectedTokenList.value.length === 0) {
    if (selectedTab.value)
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
const filterByTab = () => {
  if (selectedTab.value === TAB_TYPE.Merged) {
    // merged Token
    return [...mergedToken.value]

  } else if (selectedTab.value === TAB_TYPE.Native) {
    // Native Token
    return [...nativeToken.value]

  } else if(selectedTab.value ===TAB_TYPE.Externally){
    return [...externallyBridgedToken.value]
  }else {
    // Bridge Token
    return [...bridgedToken.value];

  }
}

const sortKey = ref<string>("tvl");
const sortOrder = ref<string>('asc')
const sortBy = (column: string) => {
  if (sortKey.value === column) {
    sortOrder.value =
      sortOrder.value === "asc" ? "desc" : sortOrder.value === "desc" ? "" : "asc";
  } else {
    sortKey.value = column;
    sortOrder.value = "asc";
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

let timerId: ReturnType<typeof setTimeout> | undefined = undefined;
const localLoading = ref(props.loading);
watch(() => props.loading, (newLoading) => {
  localLoading.value = newLoading;
});
watch(localLoading, (newLocalLoading) => {
  if (newLocalLoading) {
    timerId = setTimeout(() => {
      localLoading.value = false;
    }, 200);
  }
});
const mergedToken = computed(() => {
  const novaAddresses = [
    "0x2F8A25ac62179B31D62D7F80884AE57464699059",
    "0xDa4AaEd3A53962c83B35697Cd138cc6df43aF71f",
    "0x1a1A3b2ff016332e866787B311fcB63928464509",
    "0xF573fA04A73d5AC442F3DEa8741317fEaA3cDeab"
  ];
  const mergedArr = [...props.tokens].filter((item) => {
    return !item.networkKey &&
      ((item.l1Address && ETH_TOKEN_L1_ADDRESS.includes(item.l1Address)) ||
        (item.l2Address && novaAddresses.includes(item.l2Address)));
  }).map(item => {
    const matchingTokens = sourceTokenList.value?.filter(token => token.symbol === item.symbol) ?? [];
    const newMatchingTokens = matchingTokens.map((token) => {
      const obj = {
        ...token,
        tvl: (token.availableToRedeem && item.usdPrice !== 0) !== 0 ? Number(token.availableToRedeem) * item.usdPrice! : 0,
      };

      return obj;
    }).sort((a, b) => b.tvl - a.tvl);
    return { ...item, matchingTokens: newMatchingTokens };
  });
  return mergedArr;
})
const nativeToken = computed(() => {
  return [...props.tokens].filter((item) => {
    return !item.l1Address && !ETH_TOKEN_L1_ADDRESS.includes(item.l1Address!)&& !item.isExternallyToken
  });

})
const externallyBridgedToken = computed(() => {
  return [...props.tokens].filter((item) => {
    return !item.l1Address && !ETH_TOKEN_L1_ADDRESS.includes(item.l1Address!)&& item.isExternallyToken
  });

})
const bridgedToken = computed(() => {
  return [...props.tokens].filter((item) => {
    return item.l1Address&& !item.isExternallyToken
  })
})
const displayTokenList = computed(() => {
  localLoading.value = true;
  let mergeData: Token[] = [...mergedToken.value];
  // toggle tab 
  if (selectedTab.value) {
    mergeData = filterByTab()
  }
  //search by TokenName or symbol
  if (isSearchVal.value) {
    mergeData = mergeData.filter((item) => {
      return item.name!.toLowerCase().includes(isSearchVal.value.toLowerCase()) ||
        item.symbol!.toLowerCase().includes(isSearchVal.value.toLowerCase());
    });
  }

  // Hide Assets Without Price

  if (selectedFilterList.value.length > 0) {
    mergeData = mergeData.filter((item) => {
      if (!item.usdPrice) {
        return false;
      }
      const price = +item.usdPrice! * +formatBigNumberish("1".padEnd(item.decimals + 1, "0"), item.decimals);
      return price > 0;
    });
  }

  // filtering by chain Name
  if (selectedTokenList.value.length > 0) {
    mergeData = filterChain(mergeData);
  }
  // ranking
  if (sortKey.value) {
    if (!sortOrder.value) return mergeData;
    mergeData = [...mergeData].sort((a, b) => {
      if (sortKey.value === "tvl") {
        return compareValues(parseFloat(a.tvl), parseFloat(b.tvl), sortOrder.value);
      }
      return 0;
    });
  }

  return mergeData;
});

const showingCount = computed(() => displayTokenList.value.length)
defineExpose({ showingCount })
onBeforeUnmount(() => {
  if (timerId) {
    clearTimeout(timerId);
  }
});


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

.pagination {
  display: flex;
  justify-content: center;
  padding: 0.75rem;
}

.empty-state-container {
  @apply table-cell;

  .empty-state {
    @apply items-center justify-center whitespace-normal py-10;
  }
}

.search-form {
  max-width: 26rem;
  min-width: 18rem;

  .submit-icon-container {
    &:hover:not(:active) {
      .submit-icon {
        @apply bg-primary-300;
      }
    }

    &:active {
      .submit-icon {
        @apply transition-none;
      }
    }

    .submit-icon {
      @apply w-[2.875rem] rounded-r-md bg-primary-500 p-3 text-white;
    }
  }

  :deep(.search-input-container .search-input) {
    @apply py-2 border-design-900 text-white;
    background-color: transparent;

  }

  :deep(.submit-icon-container .submit-icon) {
    @apply py-2;

  }
}

.search-result {
  @apply flex items-center justify-between md:min-w-[18rem] bg-design-900 text-[#AAAAAA] px-[11px] py-2 rounded-md;

  .search-key {
    @apply text-white ml-2;
  }

  .btn-close {
    @apply w-5 h-5 text-white;
  }
}

.btn-filter {
  @apply flex items-center border rounded-md border border-design-900 p-2 text-design-900;

  .filter-count {
    height: 14px;
    width: 14px;
    line-height: 1;
    @apply flex ml-2 items-center justify-center text-[10px] bg-white rounded-lg text-design-900;
  }
}

.table-wrap {
  :deep(.table-body) {
    overflow: unset;
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


@media (max-width: 760px) {
  .token-icon-label {
    display: flex;
    flex-direction: row-reverse;
  }

  .search-form {
    max-width: auto;
    min-width: auto;
  }
}
</style>
