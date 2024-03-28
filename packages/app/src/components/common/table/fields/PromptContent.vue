<template>
  <div class="info-field-copy-content">
    <span class="prompt">{{value}}</span>
  </div>
</template>

<script lang="ts" setup>

const props = defineProps({
  value: {
    type: String,
    default: "",
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.info-field-copy-content {
  @apply -my-1 flex gap-x-4 w-full min-w-[6rem]  items-center justify-items-end;
  .prompt{
    color: rgb(156 163 175);
  }
}
</style>
