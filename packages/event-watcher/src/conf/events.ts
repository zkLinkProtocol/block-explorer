import { Address, BlockNumber, ChainId, EventName } from '../types';
import eventsGoerli from '../../events.goerli.json';
import eventsMainnet from '../../events.mainnet.json';
import eventsMainnet2 from '../../events.mainnet2.json';
export interface EventProfile {
  name: EventName;
  topic: string;
  chains: {
    [x: ChainId]: {
      contractAddress: Address;
      contractDeploymentBlock: BlockNumber;
      secureBlockNumber?: number;
    }[];
  };
}

export const Events: Record<EventName, EventProfile> = (() => {
  if (process.env.APP_ENV === 'mainnet') {
    return eventsMainnet;
  } else if (process.env.APP_ENV === 'mainnet2') {
    return eventsMainnet2;
  } else if (process.env.APP_ENV === 'goerli') {
    return eventsGoerli;
  } else {
    throw new Error('Invalid APP_ENV');
  }
})();
