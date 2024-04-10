<template>
    <span class="filter-wrap">
      <IconArrowUp :class="{ active:sortOrder === 'asc'}" />
      <IconArrowDown :class="{ active:sortOrder === 'desc'}" />
    </span>
</template>
<script lang="ts" setup>
import IconArrowDown from "@/components/icons/IconArrowDown.vue";
import IconArrowUp from "@/components/icons/IconArrowUp.vue";
const props=defineProps({
  sortOrder: {
    type: String,
    default: '',
  },
});
const emit=defineEmits<{
  (eventName:'sort'):void;
}>();
</script>
<style lang="scss" scoped>
.filter-wrap{
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content:center;
  margin-left: 6px;
  cursor: pointer;
  .active{
    @apply text-design-200;
  }
}
.th-box{
  display: flex;
  flex: auto;
  align-items: center;
  justify-content: space-between;

}
</style>