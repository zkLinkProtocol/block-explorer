<template>
  <div>
    <h1>zkLink Nova  Charts &  Statistics</h1>
    <div class="batches-container">
      <div class="p-4 flex flex-wrap">
        <div class="rounded flex-auto box">
          <div class="p-2 title">
            <a href="/charts/chart?type=TVL" class="no-underline">Daily TVL Chart</a>
          </div>
          <div class="p-2 content">
            <a href="/charts/chart?type=TVL" class="inline-block w-full">
              <img class="img-fluid w-100" src="/images/transactionhistory.svg" alt="">
            </a>
          </div>
        </div>
        <div class="rounded flex-auto box">
          <div class="p-2 title">
            <a href="/charts/chart?type=add" class="no-underline">Unique Addresses Chart</a>
          </div>
          <div class="p-2 content">
            <a href="/charts/chart?type=add" class="inline-block w-full">
              <img class="img-fluid w-100" src="/images/address.svg" alt="">
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import useBatches from "@/composables/useBatches";
import useContext from "@/composables/useContext";

const { t } = useI18n();

const context = useContext();
const route = useRoute();

const { load, pending, failed, data, total, pageSize, page } = useBatches(context);

watch(
  () => route.query.page,
  (page) => {

  },
  { immediate: true }
);
</script>

<style lang="scss">
.batches-container {
  box-shadow: 0 0.5rem 1.2rem rgba(189,197,209,.2);
  position: relative;
  display: -ms-flexbox;
  display: flex;
  -ms-flex-direction: column;
  flex-direction: column;
  min-width: 0;
  word-wrap: break-word;
  background-color: #fff;
  background-clip: border-box;
  border: 1px solid #e7eaf3;
  border-radius: 0.5rem;
  @apply mt-8 mb-4;
  .card-header {
    padding: 0.75rem;
    margin-bottom: 0;
    background-color: #fff;
    border-bottom: 1px solid #e7eaf3;
    color: #4a4f55;
    border-radius: calc(0.5rem - 1px) calc(0.5rem - 1px) 0 0;
  }
}
.box{
  max-width: 25%;
  margin-right: 20px;
  margin-bottom: 20px;
  box-shadow: 0 0.5rem 1.2rem rgba(189,197,209,.2);
  position: relative;
  display: -ms-flexbox;
  display: flex;
  -ms-flex-direction: column;
  flex-direction: column;
  min-width: 0;
  word-wrap: break-word;
  background-color: #fff;
  background-clip: border-box;
  border: 1px solid #e7eaf3;
  border-radius: 0.5rem;
  .title{
    background-color: #f8f9fa;
    padding: 0.75rem;
    margin-bottom: 0;
    background-color: #f8f9fa !important;
    border-bottom: 1px solid #e7eaf3;
    a{
      color: #28a0f0;
    }
    a:hover{
      color: #28a0f0;
    }
  }
  .content{
    a{
      min-height: 1px;
      img{
        min-height: 30px;
      }
    }
  }
}
</style>
