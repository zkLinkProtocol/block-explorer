import { Address, BlockNumber, ChainId, EventName } from '../types'
import eventsGoerli from '../../events.goerli.json'
import eventsMainnet from '../../events.mainnet.json'

export interface EventProfile {
  name: EventName
  topic: string
  chains: {
    [x: ChainId]: {
      contractAddress: Address
      contractDeploymentBlock: BlockNumber
      secureBlockNumber?: number
    }[]
  }
}

export const Events: Record<EventName, EventProfile> =
  process.env.APP_ENV === 'mainnet' ? eventsMainnet : eventsGoerli
