<template>
  <div class="transfer-info-container">
    <span>{{ label }}</span>
    <PaymasterLabel v-if="isPaymaster" />
    <TransactionNetworkSquareBlock :network="network" />
    <AddressLink v-if="network === NOVA" :address="address" class="address">
      <span>{{ shortenFitText(address, "left") }}</span>
    </AddressLink>
    <AddressLink v-else-if="Object.values(chainNameList).includes(network)" :network="network" :address="address" class="address">
      <span>{{ shortenFitText(address, "left") }}</span>
    </AddressLink>
    <!-- L1 -->
    <template v-else>
      <a
        v-if="currentNetwork.l1ExplorerUrl"
        class="address"
        target="_blank"
        :href="`${currentNetwork.l1ExplorerUrl}/address/${address}`"
      >
        <span>{{ shortenFitText(address, "left") }}</span>
      </a>
      <span class="address" v-else>{{ shortenFitText(address, "left") }}</span>
    </template>
    <CopyButton :value="address" class="copy-btn" />
  </div>
</template>

<script lang="ts" setup>
import AddressLink from "@/components/AddressLink.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { shortenFitText } from "@/components/common/HashLabel.vue";
import PaymasterLabel from "@/components/transactions/PaymasterLabel.vue";
import TransactionNetworkSquareBlock from "@/components/transactions/TransactionNetworkSquareBlock.vue";

import useContext from "@/composables/useContext";
import { NOVA } from "@/utils/constants";


import type { Hash, NetworkOrigin } from "@/types";
import type { PropType } from "vue";
import useEnvironmentConfig from "@/composables/useEnvironmentConfig";

defineProps({
  label: {
    type: String,
    required: true,
  },
  address: {
    type: String as PropType<Hash>,
    required: true,
  },
  network: {
    type: String as PropType<NetworkOrigin>,
    required: true,
    default: "Linea",
  },
  isPaymaster: {
    type: Boolean,
  },
});
const { currentNetwork } = useContext();
const { chainNameList }=useEnvironmentConfig();

</script>

<style lang="scss" scoped>
.transfer-info-container {
  @apply flex text-sm;
  .transactions-data-link-network {
    @apply ml-2 mr-1;
  }
  .paymaster-label {
    @apply ml-2;

    & + .transactions-data-link-network {
      @apply ml-1;
    }
  }
  .copy-btn {
    @apply -top-px -mr-1.5 inline-block align-top;
  }
  .address {
    @apply mr-1;
  }
}
</style>
