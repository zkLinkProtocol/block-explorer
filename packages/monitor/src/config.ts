import { config } from 'dotenv';
import * as fs from 'fs';
import * as JSONStream from 'JSONStream';
import * as path from 'path';
const monitorAddressListPath = '../zklMonitorWallet.json';
import { IMonitorAddress } from './watcher/watcher.service';
config();
export default async () => {
  const {} = process.env;

  return {
    monitor: {
      monitorAddressList: await getMonitorAddressList(),
      chainBaseApiKey: process.env['CHAIN_BASE_API_KEY'],
      needInit: 'true' === process.env['need_init'],
      bot: process.env['bot'],
    },
  };
};
async function getMonitorAddressList(): Promise<IMonitorAddress[]> {
  const readStream = fs.createReadStream(
    path.join(__dirname, monitorAddressListPath),
  );
  const jsonStream = JSONStream.parse('*');

  readStream.pipe(jsonStream);
  const res = [];
  await new Promise((resolve, reject) => {
    jsonStream.on('data', (item: any) => {
      res.push(item);
    });

    jsonStream.on('end', resolve);
    jsonStream.on('error', reject);
  });
  return (res as IMonitorAddress[]).map((item) => ({
    ...item,
  }));
}

export const networkChainIdMap = {
  ethereum: 1,
  zksync: 324,
  arbitrum: 42161,
  mantle: 5000,
  manta: 169,
  blast: 81457,
  optimism: 10,
  base: 8453,
  scroll: 534352,
  primary: 59144,
  sepolia: 11155111,
};
