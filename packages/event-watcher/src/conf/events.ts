import { Address, BlockNumber, ChainId, EventName } from '../types';
import { EVENTS_GOERLI } from '../../events.goerli';
import { EVENTS_MAINNET } from '../../events.mainnet';
import { EVENTS_MAINNET2 } from '../../events.mainnet2';
import { EVENTS_SEPOLIA } from '../../events.sepolia';
import * as process from "process";
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
    return EVENTS_MAINNET;
  } else if (process.env.APP_ENV === 'mainnet2') {
    return EVENTS_MAINNET2;
  } else if (process.env.APP_ENV === 'goerli') {
    return EVENTS_GOERLI;
  } else if (process.env.APP_ENV === 'sepolia') {
    return EVENTS_SEPOLIA;
  }
    else{
    throw new Error('Invalid APP_ENV');
  }
})();
