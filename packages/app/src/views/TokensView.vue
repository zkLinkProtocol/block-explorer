<template>
  <div>
    <div class="head-token">
      <Breadcrumbs :items="breadcrumbItems" />
      <SearchForm class="search-form" />
    </div>
    <div class="tokens-header">
      <h1>{{ t("tokensView.heading") }}</h1>
      <div v-if="tokens[0]?.iconURL" class="coingecko-attribution">
        <span>{{ t("tokensView.offChainDataPoweredBy") }}{{ " " }}</span>
        <a href="https://www.coingecko.com/en/api" target="_blank">CoinGecko API</a>
      </div>
    </div>
    <div class="tokens-container">
      <span v-if="isTokensFailed" class="error-message">
        {{ t("failedRequest") }}
      </span>
      <TokenTable ref="childRef" :tokens="tokens" :loading="isTokensPending"></TokenTable>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import SearchForm from "@/components/SearchForm.vue";
import Breadcrumbs, { type BreadcrumbItem } from "@/components/common/Breadcrumbs.vue";
import TokenTable from "@/components/token/TokenListTable.vue";

import useTokenLibrary from "@/composables/useTokenLibrary";

const {
  tokens,
  isRequestPending: isTokensPending,
  isRequestFailed: isTokensFailed,
  getTokens,
} = useTokenLibrary();

const { t } = useI18n();
const breadcrumbItems = computed((): BreadcrumbItem[] => [
  {
    text: t("breadcrumbs.home"),
    to: { name: "home" },
  },
  {
    text: `${t("tokensView.title")}`,
  },
]);

getTokens();
</script>
<style lang="scss">
.tokens {
  .hero-banner-container{
    @apply h-[15.3rem] sm:h-[16rem] lg:h-[16rem];
  }
}
</style>

<style scoped lang="scss">
.head-token {
  @apply mb-4 flex flex-col-reverse justify-between lg:flex-row;

  .search-form {
    @apply mb-6 w-full max-w-[26rem] lg:mb-0;
  }
}

.tokens-container {
  @apply mt-8;
}

.tokens-header {
  @apply flex justify-between items-end gap-4;

  .coingecko-attribution {
    @apply mr-1 text-gray-300;

    a {
      @apply text-blue-100;
    }
  }
}

.showing-tips {
  @apply mb-2;
  color: #D1D5DB;
}

</style>
