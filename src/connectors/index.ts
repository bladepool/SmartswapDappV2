import { Web3Provider } from '@ethersproject/providers';
import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { WalletLinkConnector } from '@web3-react/walletlink-connector';
import { BscConnector } from '@binance-chain/bsc-connector';
import { PortisConnector } from '@web3-react/portis-connector';
import { NetworkConnector } from './NetworkConnector';
import { ALL_SUPPORTED_CHAIN_IDS } from '../constants/chains';
// import SMARTSWAP_LOGO from '../assets/images/rgpLogo.webp'
// import Logo from '/logo192.png'

const NETWORK_URL = process.env.REACT_APP_NETWORK_URL;

export enum ConnectorNames {
  Injected = "injected",
  WalletConnect = "walletconnect",
  BSC = "bsc"
}

export const NETWORK_CHAIN_ID: number = parseInt(
  process.env.REACT_APP_CHAIN_ID ?? '56'
);

if (typeof NETWORK_URL === 'undefined') {
  throw new Error(
    `REACT_APP_NETWORK_URL must be a defined environment variable`
  );
}

export const network = new NetworkConnector({
  urls: { [NETWORK_CHAIN_ID]: NETWORK_URL },
});

let networkLibrary: Web3Provider | undefined;
export function getNetworkLibrary(): Web3Provider {
  // eslint-disable-next-line no-return-assign
  return (networkLibrary =
    networkLibrary ?? new Web3Provider(network.provider as any));
}

export const injected = new InjectedConnector({
    supportedChainIds: ALL_SUPPORTED_CHAIN_IDS,
});
 const supportedChainIds = [1,3, 4, 56, 97, 80001, 137]
 export const checkSupportedIds = (chainID:number)=>supportedChainIds.some(id => id ===chainID)
export const bscConnector = new BscConnector({
  supportedChainIds: ALL_SUPPORTED_CHAIN_IDS,
});

export const walletconnect = new WalletConnectConnector({
  rpc: {
      56 : NETWORK_URL
  },
  bridge: 'https://bridge.walletconnect.org',
  qrcode: true,
  pollingInterval: 15000,
});

// export const walletlink = new WalletLinkConnector({
//     url: NETWORK_URL,
//     appName: 'Smartswap',
//     appLogoUrl: SMARTSWAP_LOGO

// })


export const connectorsByName = {
  [ConnectorNames.Injected]: injected,
  [ConnectorNames.WalletConnect]: walletconnect,
  [ConnectorNames.BSC]: bscConnector,

};