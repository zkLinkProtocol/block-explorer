<template>
  <div class="transactions-data-link-network">
    {{ network }}
  </div>
</template>

<script lang="ts" setup>
import type { NetworkOrigin } from "@/types";
import type { PropType } from "vue";

defineProps({
  network: {
    type: String as PropType<NetworkOrigin>,
    required: true,
    default: "Linea",
  },
});
</script>

<style scoped lang="scss">
.transactions-data-link-network {
  @apply h-[20px] min-w-[40px] px-1 rounded bg-neutral-200 text-center text-sm text-neutral-800;
}
</style>
