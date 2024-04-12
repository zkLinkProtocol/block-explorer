<template>
    <div class="max-w-sm px-1">
        <Popover v-slot="{ open, close }" class="relative">
            <PopoverButton>
                <button class="btn-filter mr-4 ">
                    <IconFilter class="mr-1" />
                    <span>Filter</span>
                    <span class="filter-count" v-if="isActive">1</span>
                </button>
            </PopoverButton>
            <transition enter-active-class="transition duration-200 ease-out" enter-from-class="translate-y-1 opacity-0"
                enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-150 ease-in"
                leave-from-class="translate-y-0 opacity-100" leave-to-class="translate-y-1 opacity-0">
                <PopoverPanel v-if="open" class="absolute left-0 z-10 mt-3 max-w-sm transform px-4 sm:px-0">
                    <div class="popup-content rounded-lg shadow-lg bg-rounded md:min-w-[200px]">
                        <div class="btn-wrap">
                            <button @click="applyFilter(close)">Filter</button>
                            <button @click="resetFilter(close)"
                                :class="{ 'btn-reset': true, active: isActive }">Reset</button>
                        </div>
                        <ul class="options-wrap">
                            <li>
                                <label class="label">
                                    <input type="checkbox" class="input" v-model="selectedFilters" value="price" />
                                    Show token without price
                                </label>
                            </li>
                        </ul>
                    </div>
                </PopoverPanel>
            </transition>
        </Popover>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from "vue";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/vue";
import Input from "../common/Input.vue";
import IconFilter from "@/components/icons/IconFilter.vue"

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
const selectedFilters = ref<string[]>([]);
const isActive = computed(() => selectedFilters.value.length > 0)
const applyFilter = (close: any) => {
    close();
    emit("update:selected", selectedFilters.value);
    emit("filter");
};
const resetFilter = (close: any) => {
    close();
    selectedFilters.value = [];
    emit("update:selected", []);
    emit("reset")
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

.btn-reset {
    @apply text-[#999];

    &.active {
        @apply text-[#8086F2];
    }
}

.footer-wrap {
    @apply flex items-center justify-between mt-4 p-2 border-t-[1px] border-gray-200;
}

.options-wrap {
    @apply flex flex-col max-h-60 overflow-y-auto;

    li {
        @apply py-2 flex focus:outline-none;

        .label {
            @apply flex items-center focus:outline-none;
        }
    }
}

.popup-content {
    border-radius: 4px;
    border: 1px solid #414141;
    background: #0E0E0E;
    @apply px-4 pt-4 pb-6 text-white min-w-[15rem];
}

.btn-wrap {
    @apply flex items-center justify-between mb-2;
    font-size: 1rem;
}

.input {
    @apply text-design-900 mr-2 bg-transparent checked:bg-design-900 rounded-sm focus:ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-transparent;


}
.btn-filter{
  @apply flex items-center border rounded-md border border-design-900 p-2 text-design-900;
  .filter-count{
    height: 14px;
    width: 14px;
    line-height: 1;
    @apply flex ml-2 items-center justify-center text-[10px] bg-white rounded-lg text-design-900;
  }
}
</style>
