<template>
  <Table :data-testid="$testId.tokensTable" :loading="loading" :items="tokens" ref="table">
    <template #table-head>
      <table-head-column>{{ t("tokensView.table.tokenName") }}</table-head-column>
      <table-head-column>{{ t("tokensView.table.price") }}</table-head-column>
      <table-head-column>{{ t("tokensView.table.tvl") }}</table-head-column>
      <table-head-column class="text-center">{{ t("tokensView.table.fromChain") }}</table-head-column>
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
      <TableBodyColumn :data-heading="t('tokensView.table.tvl')">
        <TokenTVL :tvl="item.tvl" />
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('tokensView.table.fromChain')">
        <div v-if="iconsList[item.networkKey]">
          <Tooltip class="batches-tooltip">
            <img class="from-chain-icon" :src="iconsList[item.networkKey]" :alt="item.networkKey" />
            <template #content>{{ chainNameList[item.networkKey] }}</template>
          </Tooltip>
        </div>
        <div v-else-if="ETH_TOKEN_L1_ADDRESS.includes(item.l1Address)" class="from-chain-text">{{ NOVA_MERGED_TOKEN }}</div>
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
      <TableBodyColumn :data-heading="t('tokensView.table.originAddress')">
        <div v-if="item.l1Address && !ETH_TOKEN_L1_ADDRESS.includes(item.l1Address)" class="token-address-container max-w-sm">
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
      </tr>
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
import Tooltip from "@/components/common/Tooltip.vue";
import ContentLoader from "@/components/common/loaders/ContentLoader.vue";
import Table from "@/components/common/table/Table.vue";
import TableBodyColumn from "@/components/common/table/TableBodyColumn.vue";
import TableHeadColumn from "@/components/common/table/TableHeadColumn.vue";
import TokenPrice from "@/components/common/table/fields/TokenPrice.vue";
import TokenTVL from "@/components/common/table/fields/TokenTVL.vue";
import TransactionNetworkSquareBlock from "@/components/transactions/TransactionNetworkSquareBlock.vue";

// import { iconList } from "@/configs/hyperchain.config.json"
import useEnvironmentConfig from "@/composables/useEnvironmentConfig";

import { NOVA_NATIVE_TOKEN, ETH_TOKEN_L1_ADDRESS, NOVA_MERGED_TOKEN } from "@/utils/constants";

const { iconsList, chainNameList } = useEnvironmentConfig();

import type { Token } from "@/composables/useToken";

defineProps({
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
  min-width: 240px;
  @apply flex items-center justify-center;
}
@media (max-width: 760px) {
  .token-icon-label {
    display: flex;
    flex-direction: row-reverse;
  }
}
</style>
