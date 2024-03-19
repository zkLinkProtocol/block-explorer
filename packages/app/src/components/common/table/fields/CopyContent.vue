<template>
  <div class="info-field-copy-content" :class="{ 'show-icon': isShowIcon }">
    <Tooltip class="batches-tooltip inline-flex justify-self-start" v-if="isShowIcon">
      <img class="eth_block-icon" src="/img/ethereum.svg" alt=""/>
      <template #content>Ethereum</template>
    </Tooltip>
    <HashLabel v-if="value" :text="value">
      <ExternalLinkIcon v-if="isExternalLink"/>
    </HashLabel>
    <CopyButton v-if="value" :value="value"/>
  </div>
</template>

<script lang="ts" setup>
import { ExternalLinkIcon } from "@heroicons/vue/solid";

import CopyButton from "@/components/common/CopyButton.vue";
import HashLabel from "@/components/common/HashLabel.vue";
import Tooltip from "@/components/common/Tooltip.vue";

defineProps({
  value: {
    type: String,
    default: "",
    required: true,
  },
  isExternalLink: {
    type: Boolean,
    default: false,
  },
  isShowIcon: {
    type: Boolean,
    default: false,
  },
});
</script>

<style lang="scss">
.info-field-copy-content {
  @apply -my-1 grid w-full min-w-[6rem] grid-cols-9 items-center justify-items-end;
  .eth_block-icon {
    @apply h-7 w-7 rounded-full mr-1;
  }

  &.show-icon {
    @apply grid-cols-10;
  }
}
</style>
