<template>
  <Table :items="list" :loading="loading || !address" :class="{ empty: !list?.length }" class="transfers-table">
    <template #table-head v-if="list?.length && list?.length > 0">
      <!-- <TableHeadColumn>
        Rank
      </TableHeadColumn> -->
      <TableHeadColumn>
       Address
      </TableHeadColumn>
      <TableHeadColumn>
        Quantity
      </TableHeadColumn>
      <TableHeadColumn>
        Percentage
      </TableHeadColumn>
      <TableHeadColumn>
       value
      </TableHeadColumn>
    </template>

    <template #table-row="{ item }: { item: any }">
      <TableBodyColumn :data-heading="t('transfers.table.age')">
        <span class="transactions-data-link">
          <router-link
            :data-testid="$testId.transactionsHash"
            :to="{
              name: 'transaction',
              params: { hash: item.address },
            }"
          >
            {{ shortenFitText(item.address, "left", 150) }}
          </router-link>
        </span>
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('transfers.table.type')" class="transfer-type">
        <span>{{ item.balance }}</span>
      </TableBodyColumn>
      <TableBodyColumn :data-heading="t('transfers.table.from')" class="tablet-column-hidden">
        <span>{{ item.usdPrice*Number(item.balance)/Number(totalSupply)*100 }}%</span>
      </TableBodyColumn>
      <TableBodyColumn>
        <span>${{ item.usdPrice || 0 }}</span>
      </TableBodyColumn>
    </template>
    <template #empty>
      <EmptyState />
    </template>
  </Table>
</template>
<script lang="ts" setup>
import { computed, ref, watch,watchEffect } from "vue";
import { useI18n } from "vue-i18n";

import EmptyState from "./EmptyState.vue";
import LoadingState from "./LoadingState.vue";

import AddressLink from "@/components/AddressLink.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { shortenFitText } from "@/components/common/HashLabel.vue";
import Pagination from "@/components/common/Pagination.vue";
import Table from "@/components/common/table/Table.vue";
import TableBodyColumn from "@/components/common/table/TableBodyColumn.vue";
import TableHeadColumn from "@/components/common/table/TableHeadColumn.vue";
import TimeField from "@/components/common/table/fields/TimeField.vue";
import TokenAmountPriceTableCell from "@/components/transactions/TokenAmountPriceTableCell.vue";
import TransactionDirectionTableCell, {
  type Direction,
} from "@/components/transactions/TransactionDirectionTableCell.vue";
import TransactionNetworkSquareBlock from "@/components/transactions/TransactionNetworkSquareBlock.vue";
import useEnvironmentConfig from "@/composables/useEnvironmentConfig";

import useHolders from "@/composables/useHolders";
import { NOVA } from '@/utils/constants'

import { utcStringFromISOString } from "@/utils/helpers";
import { $fetch, FetchError } from "ohmyfetch";

const { t } = useI18n();
const { chainNameList,ERC20Bridges } = useEnvironmentConfig();
const totalSupply = ref(0);
const props = defineProps({
  address: {
    type: String,
    required: true,
    default: () => null,
  },
});

const { getByAddress, list, loading } = useHolders();
list.value.map((i) => {
  if (i.totalSupply) {
    totalSupply.value = i.totalSupply
  }
})
const activePage = ref(1);
const toDate = new Date();


watchEffect(() => {
  getByAddress(props.address);
});
</script>

<style lang="scss">
.transfers-table {
  .table-body {
    th.table-head-col {
      @apply min-w-0 sm:min-w-[7rem];
    }
  }

  td {
    @apply relative flex flex-col items-end justify-end text-right md:table-cell md:h-[56.5px] md:text-left;
    &:before {
      @apply absolute left-4 top-3 whitespace-nowrap pr-5 text-left text-xs uppercase text-neutral-400 content-[attr(data-heading)] md:content-none;
    }
  }

  &.has-head {
    table thead tr th {
      @apply first:rounded-none last:rounded-none;
    }
  }

  .tablet-column {
    @apply hidden md:table-cell lg:hidden;
  }
  .tablet-column-hidden {
    @apply md:hidden lg:table-cell;
  }

  .pagination {
    @apply flex justify-center p-3;
  }

  .transfer-type {
    @apply capitalize;
  }

  .copy-button-container {
    @apply flex w-fit;
    .copy-button {
      @apply static p-0 focus:ring-0;
    }
  }

  .transfers-in-out {
    @apply md:m-auto;
  }

  .transfers-data-link {
    @apply flex items-center gap-x-1;
    a,
    .transfers-data-link-value {
      @apply block cursor-pointer text-sm font-medium;
    }
    span.transfers-data-link-value {
      @apply cursor-default;
    }
  }
}
</style>
