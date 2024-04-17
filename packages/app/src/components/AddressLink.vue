<template>
  <a v-if="network === 'L1' && !!currentNetwork.l1ExplorerUrl" target="_blank"
    :href="`${currentNetwork.l1ExplorerUrl}/address/${formattedAddress}`">
    <slot>
      {{ formattedAddress }}
    </slot>
  </a>
  <a v-else-if="network === 'origin' && networkKey" target="_blank"
    :href="`${getExplorerUrlPrefix(networkKey)}/address/${formattedAddress}`">
    <slot>
      {{ formattedAddress }}
    </slot>
  </a>
  <a v-else-if="isErc20Bridge" target="_blank"
    :href="`${getExplorerUrlPrefix(erc20Key)}/address/${formattedAddress}`">
    <slot>
      {{ formattedAddress }}
    </slot>
  </a>
  <span v-else-if="network === 'L1' && !currentNetwork.l1ExplorerUrl">
    <slot>
      {{ formattedAddress }}
    </slot>
  </span>
  <router-link v-else :to="{ name: 'address', params: { address: formattedAddress } }">
    <slot>
      {{ formattedAddress }}
    </slot>
  </router-link>
</template>

<script lang="ts" setup>
import { computed, type PropType } from "vue";

import useContext from "@/composables/useContext";

import type { Address } from "@/types";
import type { NetworkOrigin } from "@/types";

import { getExplorerUrlPrefix } from "@/configs/networkKey";
import { checksumAddress } from "@/utils/formatters";
import useEnvironmentConfig from "@/composables/useEnvironmentConfig";

const { chainNameList }=useEnvironmentConfig();

const props = defineProps({
  address: {
    type: String as PropType<Address>,
    default: "",
    required: true,
  },
  network: {
    type: String as PropType<NetworkOrigin>,
    default: "L2",
  },
  networkKey: {
    type: String,
    default: "",
  },
});

const { currentNetwork } = useContext();
const formattedAddress = computed(() => checksumAddress(props.address));
const isErc20Bridge=computed(() => {
  return Object.values(chainNameList).includes(props.network)
})
const erc20Key=computed(() => {
  return Object.keys(chainNameList).find(key => chainNameList[key] === props.network);
})


</script>
