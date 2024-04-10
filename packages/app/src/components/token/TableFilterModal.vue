<template>
  <div class="max-w-sm px-1">
    <Popover v-slot="{ open, close }" class="relative">
      <PopoverButton class="group inline-flex items-center px-1 text-base font-medium focus:outline-none">
        <FilterIcon class="w-4 h-4 text-black" :class="{ 'text-design-200': selected.length > 0 }" />
      </PopoverButton>

      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-1 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-1 opacity-0"
      >
        <PopoverPanel v-if="open" class="absolute left-1/2 z-10 mt-3 max-w-sm -translate-x-1/2 transform px-4 sm:px-0">
          <div class="rounded-lg shadow-lg bg-rounded bg-white md:min-w-[200px]">
            <div class="search-wrap" v-if="isSearch">
              <Input v-model="filterKeyword" @keyup="handleKeyUp" type="text" placeholder="" />
            </div>

            <ul class="options-wrap">
              <li v-for="(item, itemIndex) in filterOptions" :key="itemIndex">
                <label class="label">
                  <input type="checkbox" v-model="selectedFilters" :value="item" />
                  {{ item }}
                </label>
              </li>
            </ul>
            <div class="footer-wrap">
              <button @click="resetFilter(close)" class="btn btn-reset">Reset</button>
              <button @click="applyFilter(close)" class="btn">confirm</button>
            </div>
          </div>
        </PopoverPanel>
      </transition>
    </Popover>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/vue";
import { FilterIcon } from "@heroicons/vue/outline";
import Input from "../common/Input.vue";

const props = defineProps({
  filterOptions: {
    type: Array<string>,
    default: [],
  },
  keyword: {
    type: String,
    default: "",
  },
  selected: {
    type: Array<string>,
    default: [],
  },
  isSearch: {
    type: Boolean,
    default: true,
  },
  modelValue: {
    type: String,
    default: null,
    required: false,
  },
});
const emit = defineEmits<{
  (eventName: "update:modelValue", value: string): void;
  (eventName: "update:selected", value: string[]): void;
  (eventName: "filter"): void;
  (eventName: "reset"): void;
}>();
const filterKeyword = ref(props.keyword);
const selectedFilters = ref<string[]>([]);

const applyFilter = (close: any) => {
  close();
  emit("update:selected", selectedFilters.value);
  emit("filter");
};
const resetFilter = (close: any) => {
  selectedFilters.value = [];
  filterKeyword.value = "";
  close();
  emit("update:selected", []);
  emit("reset")
};
const handleKeyUp = (event: any) => {
  const value = event.target.value.trim();
  emit("update:modelValue", value);
};
watch(
  () => props.selected,
  (val: string[], oldval) => {
    selectedFilters.value = val;
  }
);
</script>
<style lang="scss" scoped>
.search-wrap {
  @apply mb-4 p-2 border-b-[1px] border-gray-200;

  :deep(.input-container .input) {
    @apply py-2;
  }
}
.btn {
  @apply rounded-md text-white bg-design-200 p-1.5 focus:outline-none;
}
.btn-reset {
  @apply rounded-md border border-neutral-300 bg-white text-black p-1.5 focus:outline-none;
}
.footer-wrap {
  @apply flex  items-center justify-between mt-4 p-2 border-t-[1px] border-gray-200;
}
.options-wrap {
  @apply p-2 flex flex-col max-h-60 overflow-y-auto;
  li {
    @apply p-2 flex focus:outline-none;
    .label {
      @apply focus:outline-none;
    }
  }
}
</style>
