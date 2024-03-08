<template>
  <div class="info-field-copy-content" :class="{ isshowicon: isShowIocn }">
    <Tooltip class="batches-tooltip" v-if="isShowIocn">
      <img class="eth_block-icon" src="/img/ethereum.svg" alt="" />
      <template #content>Ethereum</template>
    </Tooltip>
    <HashLabel :text="value">
      <ExternalLinkIcon v-if="isExternalLink" />
    </HashLabel>
    <CopyButton :value="value" />
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
  isShowIocn: {
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
  &.isshowicon {
    @apply grid-cols-10;
  }
}
</style>
