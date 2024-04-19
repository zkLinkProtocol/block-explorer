<template>
  <div class="token-icon-label">
    <AddressLink :address="address" class="token-link" :data-testid="$testId?.tokensIcon">
      <span v-if="showLinkSymbol" class="token-symbol">
        <span v-if="symbol">
          {{ symbol }}
        </span>
        <span class="unknown-token-symbol" v-else>{{ t("balances.table.unknownSymbol") }}</span>
      </span>
      <div class="token-icon-container" :class="iconSize">
        <div class="token-img-loader"></div>
        <img class="token-img" :class="{ loaded: isImageLoaded }" :src="imgSource"
          :alt="symbol || t('balances.table.unknownSymbol')" />
      </div>
    </AddressLink>
    <div class="token-info" v-if="name && symbol">
      <div class="token-symbol">
        {{ symbol }}
        <img v-if="showMask" src="/images/icon-metamask.svg" class="metamask-image" @click="addToken" />
      </div>
      <div class="token-name">
        <span>{{ name }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, type PropType } from "vue";
import { useI18n } from "vue-i18n";

import { useImage } from "@vueuse/core";

import AddressLink from "@/components/AddressLink.vue";
import { addTokenToWeb3Wallet } from '@/utils/wallet';

import type { Hash } from "@/types";

export type IconSize = "sm" | "md" | "lg" | "xl";

const { t } = useI18n();

const props = defineProps({
  address: {
    type: String as PropType<Hash>,
    required: true,
  },
  symbol: {
    type: [String, null] as PropType<string | null>,
    default: null,
  },
  iconSize: {
    type: String as PropType<IconSize>,
    default: "sm",
  },
  iconUrl: {
    type: [String, null] as PropType<string | null>,
    default: "",
  },
  showLinkSymbol: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    default: "",
  },
  showMask: {
    type: Boolean,
    default: false,
  },
  decimals: {
    type: Number,
    default: 0,
  }
});

const imgSource = computed(() => {
  return props.iconUrl || "/images/currencies/customToken.svg";
});
const { isReady: isImageLoaded } = useImage({ src: imgSource.value });
const addToken = () => {
  addTokenToWeb3Wallet({
    address: props.address,
    symbol: props.symbol!,
    decimals: props.decimals,
    image: props.iconUrl!,
  })
}
</script>

<style lang="scss">
.token-icon-label {
  @apply flex items-center gap-x-2 text-sm;

  .token-link {
    @apply flex items-center gap-x-1;

    .unknown-token-symbol {
      @apply italic;
    }

    .token-icon-container {
      @apply relative overflow-hidden rounded-full;
      &.sm {
        @apply h-4 w-4;
      }
      &.md {
        @apply h-5 w-5;
      }
      &.lg {
        @apply h-6 w-6;
      }
      &.xl {
        @apply h-8 w-8;
      }

      .token-img-loader,
      .token-img {
        @apply absolute inset-0 h-full w-full rounded-full;
      }
      .token-img-loader {
        @apply animate-pulse bg-neutral-200;
      }
      .token-img {
        @apply opacity-0 transition-opacity duration-150;
        &.loaded {
          @apply opacity-100;
        }
      }
    }
  }
  .token-info {
    .token-symbol {
      @apply flex text-neutral-600;
    }
    .token-name {
      @apply flex items-center text-xs text-neutral-400;
    }
  }
.token-tag{
    @apply flex items-center justify-center gap-8 ml-1;

    padding: 2px 4px;
    border-radius: 4px;
    background: #E4E5FE;
    color: #7e798d;
  }

  &:hover {
    .metamask-image {
      display: block;
    }
  }

  .metamask-image {
    @apply w-5 ml-2 hover:cursor-pointer hidden transition duration-300;

  }
}
</style>
