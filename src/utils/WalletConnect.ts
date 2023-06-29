import { WalletConnect, WalletConnectConstructorArgs } from '@web3-react/walletconnect-v2'
import { L1_CHAIN_IDS, L2_CHAIN_IDS, SupportedChainId } from 'constants/chains'

import { JSON_RPC_FALLBACK_ENDPOINTS } from 'constants/jsonRpcEndpoints'


// Avoid testing for the best URL by only passing a single URL per chain.
// Otherwise, WC will not initialize until all URLs have been tested (see getBestUrl in web3-react).
const RPC_URLS_WITHOUT_FALLBACKS = Object.entries(JSON_RPC_FALLBACK_ENDPOINTS).reduce(
  (map, [chainId, urls]) => ({
    ...map,
    [chainId]: urls[0],
  }),
  {}
)
const optionalChains = [...L1_CHAIN_IDS, ...L2_CHAIN_IDS].filter((x) => x !== SupportedChainId.MAINNET)

export class WalletConnectV2 extends WalletConnect {
  ANALYTICS_EVENT = 'Wallet Connect QR Scan'
  constructor({
    actions,
    onError,
    qrcode = true,
  }: Omit<WalletConnectConstructorArgs, 'options'> & { qrcode?: boolean }) {
    super({
      actions,
      options: {
        projectId: process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID as string,
        optionalChains,
        chains: [SupportedChainId.MAINNET],
        showQrModal: qrcode,
        rpcMap: RPC_URLS_WITHOUT_FALLBACKS,
        // as of 6/16/2023 there are no docs for `optionalMethods`
        // this set of optional methods fixes a bug we encountered where permit2 signatures were never received from the connected wallet
        // source: https://uniswapteam.slack.com/archives/C03R5G8T8BH/p1686858618164089?thread_ts=1686778867.145689&cid=C03R5G8T8BH
        optionalMethods: ['eth_signTypedData', 'eth_signTypedData_v4', 'eth_sign'],
      },
      onError,
    })
  }
}