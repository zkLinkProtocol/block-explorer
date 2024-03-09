<template>
  <div class="token-price-container">
    <div v-if="$props.tvl" class="token-price">
      {{ priceAmount }}
    </div>
    <div v-else>$0</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import { formatMoney } from "@/utils/formatters";

const props = defineProps({
  tvl: {
    type: String,
    default: "",
  },
});


const priceAmount = computed(() => {
  if (props.tvl) {
    return formatMoney(Number(Number(props.tvl).toFixed(0)), 0)
  }
  return "0";
});
</script>

<style scoped lang="scss">
.token-price-container {
  @apply h-[20px];
}
</style>
