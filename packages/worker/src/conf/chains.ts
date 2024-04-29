import { ChainId } from '../types'

export interface ChainInfo {
  chainId: ChainId
  web3Url: string
  viewBlockStep: number
  secureBlockNumber: number
  requestDelay: number
  requestRetryDelay: number
}

export function chainsFromEnvironments(chainIds: ChainId[]) {
  const result: Record<ChainId, ChainInfo> = {}
  chainIds.forEach((chainId) => {
    result[chainId] = {
      chainId: Number(process.env[`CHAIN_${chainId}_CHAIN_ID`]),
      web3Url: String(process.env[`CHAIN_${chainId}_CLIENT_WEB3_URL`]),
      viewBlockStep: Number(
        process.env[`CHAIN_${chainId}_CLIENT_VIEW_BLOCK_STEP`]
      ),
      requestDelay: Number(
        process.env[`CHAIN_${chainId}_CLIENT_REQUEST_DELAY`]
      ),
      requestRetryDelay: Number(
        process.env[`CHAIN_${chainId}_CLIENT_REQUEST_RETRY_DELAY`]
      ),
      secureBlockNumber: Number(
        process.env[`CHAIN_${chainId}_CLIENT_SECURE_BLOCK_NUMBER`]
      ),
    }

    if (
      typeof result[chainId].chainId !== 'number' ||
      result[chainId].chainId <= 0
    ) {
      throw new Error(
        `Initial configuration failed, invalid 'chainId' ${result[chainId]?.chainId}`
      )
    }
    if (
      typeof result[chainId].web3Url !== 'string' ||
      result[chainId].web3Url.length === 0
    ) {
      throw new Error(
        `Initial configuration failed, invalid 'web3Url' ${result[chainId]?.web3Url}`
      )
    }
    if (typeof result[chainId].viewBlockStep !== 'number') {
      throw new Error(
        `Initial configuration failed, invalid 'viewBlockStep' ${result[chainId]?.viewBlockStep}`
      )
    }
    if (typeof result[chainId].requestDelay !== 'number') {
      throw new Error(
        `Initial configuration failed, invalid 'requestDelay' ${result[chainId]?.requestDelay}`
      )
    }
    if (typeof result[chainId].requestRetryDelay !== 'number') {
      throw new Error(
        `Initial configuration failed, invalid 'requestRetryDelay' ${result[chainId]?.requestRetryDelay}`
      )
    }
    if (typeof result[chainId].secureBlockNumber !== 'number') {
      throw new Error(
        `Initial configuration failed, invalid 'secureBlockNumber' ${result[chainId]?.secureBlockNumber}`
      )
    }
  })
  return result
}
