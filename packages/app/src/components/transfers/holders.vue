<template>
  <div ref="tableWrapperRef" class="table-wrapper">
    <Table :items="list" :loading="loading || !address" :class="{ empty: !list?.length }" class="transfers-table">
      <template #table-head v-if="list?.length && list?.length > 0">
        <TableHeadColumn>
          Rank
        </TableHeadColumn>
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

      <template #table-row="{ item,index }: { item: any,index:number }">
        <TableBodyColumn>
          <span>{{ index + 1 }}</span>
        </TableBodyColumn>
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
          <span>{{ item.usdPrice * Number(item.balance) / item.totalSupply * 100 }}%</span>
        </TableBodyColumn>
        <TableBodyColumn>
          <span>${{ item.usdPrice || 0 }}</span>
        </TableBodyColumn>
      </template>
      <template #empty>
        <EmptyState />
      </template>
    </Table>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watchEffect } from "vue";
import { useI18n } from "vue-i18n";

import EmptyState from "./EmptyState.vue";
import { shortenFitText } from "@/components/common/HashLabel.vue";
import Table from "@/components/common/table/Table.vue";
import TableBodyColumn from "@/components/common/table/TableBodyColumn.vue";
import TableHeadColumn from "@/components/common/table/TableHeadColumn.vue";
import useHolders from "@/composables/useHolders";

const { t } = useI18n();
const tableWrapperRef = ref<HTMLElement | null>(null);
const props = defineProps({
  address: {
    type: String,
    required: true,
    default: () => null,
  },
});

const { getByAddress, list, loading, isAll } = useHolders();

const activePage = ref(1);

const loadMore = () => {
  activePage.value++;
  getByAddress(props.address, activePage.value);
};

const handleScroll = () => {
  if (tableWrapperRef.value && !isAll.value && !loading.value) {
    const { scrollTop, scrollHeight, clientHeight } = tableWrapperRef.value;
    if (scrollTop + clientHeight === scrollHeight) {
      loadMore();
    }
  }
};

watchEffect(() => {
  getByAddress(props.address, 1);
});

onMounted(() => {
  if (tableWrapperRef.value) {
    tableWrapperRef.value.addEventListener("scroll", handleScroll);
  }
});

onUnmounted(() => {
  if (tableWrapperRef.value) {
    tableWrapperRef.value.removeEventListener("scroll", handleScroll);
  }
});

</script>

<style lang="scss">
.table-wrapper{
  height: 50vh;
  overflow-y: auto;
}
.transfers-table {
  .table-body {
    th.table-head-col {
      min-width: 7rem;
    }
  }

  td {
    position: relative;
    flex-direction: column;
    justify-content: flex-end;
    text-align: right;
    height: 56.5px;
    @media (min-width: 768px) {
      display: table-cell;
      text-align: left;
    }
    &:before {
      position: absolute;
      left: 1rem;
      top: 0.75rem;
      white-space: nowrap;
      padding-right: 1.25rem;
      text-align: left;
      text-transform: uppercase;
      content: attr(data-heading);
      @media (min-width: 768px) {
        content: none;
      }
    }
  }

  &.has-head {
    thead tr th:first-child {
      border-top-left-radius: 0;
    }
    thead tr th:last-child {
      border-top-right-radius: 0;
    }
  }

  .tablet-column-hidden {
    @media (min-width: 768px) {
      display: none;
    }
    @media (min-width: 1024px) {
      display: table-cell;
    }
  }
}
</style>
