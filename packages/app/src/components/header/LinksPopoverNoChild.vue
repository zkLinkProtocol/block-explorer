<template>
  <Menu class="dropdown-container" as="div">
    <MenuButton>
      <div class="navigation-link">
        <router-link v-if="items[0].to" :to="items[0].to" class="text-white no-underline hover:text-white">
            {{ label }}
          </router-link>
      </div>
    </MenuButton>
  </Menu>
</template>

<script lang="ts" setup>
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import { ChevronDownIcon } from "@heroicons/vue/outline";

import type { PropType } from "vue";

type InternalNavigation = {
  label: string;
  to?: { name: string };
  url?: string;
};
defineProps({
  items: {
    type: Array as PropType<InternalNavigation[]>,
    default: () => [],
    required: true,
  },
  label: {
    type: String,
    default: "",
    required: true,
  },
});
</script>
