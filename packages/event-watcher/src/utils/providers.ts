import { providers } from 'ethers'
import { CHAINS } from '../config'
import { ChainId } from '../types'

const chainsProvider: Record<ChainId, providers.JsonRpcProvider> = {}

export function providerByChainId(chainId: ChainId) {
  if (chainsProvider[chainId]) {
    return chainsProvider[chainId]
  }

  chainsProvider[chainId] = new providers.JsonRpcProvider(
    CHAINS[chainId].web3Url,
    {
      name: '',
      chainId: chainId,
    },
  )
  return chainsProvider[chainId]
}
