import ArgentWalletContractABI from 'abis/argent-wallet-contract.json'
import { ArgentWalletContract } from 'abis/types'
import useActiveWeb3React from 'hooks/connectWeb3/useActiveWeb3React'

import { useContract } from './useContract'
import useIsArgentWallet from './useIsArgentWallet'

export function useArgentWalletContract(): ArgentWalletContract | null {
  const { account } = useActiveWeb3React()
  const isArgentWallet = useIsArgentWallet()
  return useContract(
    isArgentWallet ? account ?? undefined : undefined,
    ArgentWalletContractABI,
    true
  ) as ArgentWalletContract
}
