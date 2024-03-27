<template>
  <div class="token-price-container">
    <div v-if="$props.totalSupply?.hex" class="token-price">
      {{ totalCount }}
    </div>
    <div v-else>0</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import { formatBigNumberish, formatNumberPretty } from "@/utils/formatters";

const props = defineProps({
  totalSupply: {
    type: Object,
  },
  decimals: {
    type: Number,
    default: 0,
  },
});

const totalCount = computed(() => {
  if (props.totalSupply?.hex) {
    return formatNumberPretty(formatBigNumberish(props.totalSupply.hex, props.decimals));
  }
  return "0";
});
</script>

<style scoped lang="scss">
.token-price-container {
  @apply h-[20px];
}
</style>
