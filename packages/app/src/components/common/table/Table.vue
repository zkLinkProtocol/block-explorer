<template>
  <div class="table-container" :class="[{ 'has-head': !!$slots['table-head'] }, { 'has-footer': !!$slots['footer'] }]">
    <div class="table-body">
      <table cellspacing="0" cellpadding="0">
        <thead v-if="$slots['table-head']">
          <tr>
            <slot name="table-head"></slot>
          </tr>
        </thead>
        <tbody v-if="!loading">
          <slot />
          <template v-if="items?.length">
            <template v-for="(item, index) in items" :key="index">
              <tr>
                <slot name="table-row" :item="item" :index="index"></slot>
                <td class="table-body-col mobile-col" v-if="expandable">
                  <div @click="toggleExpand(index, item)">
                    <slot name="expand-button" :item="item" :index="index" :active="expandedRows.includes(index)">
                    </slot>
                  </div>
                </td>
              </tr>
              <tr v-if="expandedRows.includes(index) && expandable">
                <slot name="table-row-expanded" :item="item" :index="index"></slot>
              </tr>
            </template>
          </template>
          <template v-else-if="$slots.empty && !failed">
            <slot name="empty"></slot>
          </template>
          <template v-else-if="$slots.failed && failed">
            <slot name="failed"></slot>
          </template>
        </tbody>
        <tbody v-else>
          <slot name="loading" />
        </tbody>
      </table>
    </div>
    <div v-if="$slots.footer" class="table-footer" :class="[items?.length! % 2 ? 'bg-neutral-50' : 'bg-white']">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType } from "vue";

defineProps({
  items: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: Array as PropType<any[] | null>,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: true,
  },
  failed: {
    type: Boolean,
    default: false,
  },
  expandable: {
    type: Boolean,
    default: false,

  }
});
const expandedRows = ref([] as number[]);

const toggleExpand = (index: number, item: any) => {
  if (expandedRows.value.includes(index)) {
    expandedRows.value = expandedRows.value.filter(row => row !== index);
  } else {
    expandedRows.value.push(index);
  }
};
</script>

<style lang="scss">
.table-container {
  @apply w-full rounded-lg shadow-md;

  .table-body {
    @apply w-full overflow-auto;

    &>table>thead tr {
      @apply absolute left-[-9999px] top-[-9999px] md:relative md:left-0 md:top-0;
    }
  }

  &.has-head {
    table thead tr th {
      @apply first:rounded-tl-lg last:rounded-tr-lg;
    }
  }

  &:not(.has-head) {
    table tbody tr:first-child td {
      @apply first:rounded-tl-lg last:rounded-tr-lg;
    }
  }

  &:not(.has-footer) {
    .table-body {
      @apply rounded-b-lg;
    }

    table tbody tr:last-child td {
      @apply first:rounded-bl-lg last:rounded-br-lg;
    }
  }

  table {
    @apply w-full border-collapse border-none;

    thead {
      @apply md:border-b;

      tr th {
        @apply bg-gray-100;
      }
    }

    tbody {
      tr {
        @apply transition last:border-b-0 odd:bg-white even:bg-gray-50 md:border-b;
      }
    }
  }

  .table-footer {
    @apply w-full rounded-b-lg;
  }
}
.mobile-col{
  @apply relative flex flex-col items-end justify-end text-right md:table-cell md:w-1/3 md:text-left;

}

@media (max-width: 760px) {
  .table-container table {
    tbody {
      tr {
        border-bottom-width: 1px;
      }

      tr:nth-child(even) {
        background-color: rgba(245, 247, 250, 0.02);
      }
    }
  }
}
</style>
