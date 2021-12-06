import {
  Currency,
  CurrencyAmount,
  Percent,
  Price,
  Token,
} from '@uniswap/sdk-core';

import JSBI from 'jsbi';
import { ReactNode, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../index';

import { Field, selectCurrency, typeInput } from './actions';
import { useActiveWeb3React } from '../../utils/hooks/useActiveWeb3React';
import { AppDispatch } from '../index';
import { useNativeBalance } from '../../utils/hooks/useBalances';
import { useCurrency } from '../../hooks/Tokens';
import { provider } from '../../utils/utilsFunctions';
import { getERC20Token } from '../../utils/utilsFunctions';
import { isAddress } from '../../utils';
import { ethers } from 'ethers';
import { parseUnits } from '@ethersproject/units';
// import {useMint}
import { useMint } from '../../hooks/useMint';
import { ZERO_ADDRESS } from '../../constants';
const ZERO = JSBI.BigInt(0);

export function useMintState(): RootState['mint'] {
  return useSelector<RootState, RootState['mint']>((state) => state.mint);
}

export function tryParseAmount<T extends Currency>(
  value?: string,
  currency?: T
): string | undefined {
  if (!value || !currency) {
    return undefined;
  }
  try {
    const typedValueParsed = parseUnits(value, currency.decimals).toString();
    if (typedValueParsed !== '0') {
      return typedValueParsed;
    }
  } catch (error) {
    // should fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
    console.debug(`Failed to parse input amount: "${value}"`, error);
  }
  // necessary for all paths to return a value
  return undefined;
}

export function useMintActionHandlers(): {
  onCurrencySelection: (field: Field, currency: Currency) => void;
  onUserInput: (field: Field, typedValue: string, no: boolean) => void;
} {
  const { chainId, account } = useActiveWeb3React();
  const {
    independentField,
    typedValue,
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
    recipient,
  } = useMintState();

  const [Balance, Symbol] = useNativeBalance();
  const dispatch = useDispatch<AppDispatch>();
  const onCurrencySelection = useCallback(
    (field: Field, currency: Currency) => {
      dispatch(
        selectCurrency({
          field,
          currencyId: currency.isToken
            ? currency.address
            : currency.isNative
            ? currency.symbol
            : '',
        })
      );
    },
    [dispatch]
  );

  const onUserInput = useCallback(
    (field: Field, typedValue: string, no: boolean) => {
      dispatch(typeInput({ field, typedValue, no }));
    },
    [dispatch]
  );
  return {
    onCurrencySelection,
    onUserInput,
  };
}

export function useDerivedMintInfo(): {
  currencies: { [field in Field]?: Currency };
  getMaxValue: any;
  bestTrade: string | undefined;
  inputError?: string;
  parsedAmount: string | undefined;
  showWrap: boolean;
} {
  const { account } = useActiveWeb3React();
  const [Balance] = useNativeBalance();
  const {
    independentField,
    typedValue,
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
    recipient,
  } = useMintState();

  const inputCurrency = useCurrency(inputCurrencyId);
  const outputCurrency = useCurrency(outputCurrencyId);
  const isExactIn: boolean = independentField === Field.INPUT;

  const currencies: { [field in Field]?: Currency } = {
    [Field.INPUT]: inputCurrency ?? undefined,
    [Field.OUTPUT]: outputCurrency ?? undefined,
  };

  const parsedAmount = tryParseAmount(
    typedValue,
    (isExactIn ? inputCurrency : outputCurrency) ?? undefined
  );

  const [address, wrap, amount] = useMint(
    isExactIn ? inputCurrency : outputCurrency,
    isExactIn ? outputCurrency : inputCurrency,
    parsedAmount
  );

  const bestTrade = amount;

  const showWrap = wrap;

  const getMaxValue = async (currency: Currency) => {
    if (currency.isNative) {
      // return Balance === "0.0000" ? "0" :  Balance
      const Provider = await provider();
      const balance = await Provider?.getBalance(account as string);
      return balance ? JSBI.BigInt(balance.toString()) : undefined;
    } else if (isAddress(currency.address)) {
      const token = await getERC20Token(
        currency.address ? currency.address : ''
      );
      const balance = await token.balanceOf(account);
      const amount = ethers.utils.formatEther(balance);
      return amount === '0.0' ? '0' : parseFloat(amount).toFixed(4);
    }
  };

  return {
    currencies,
    getMaxValue,
    bestTrade,
    parsedAmount,
    showWrap,
  };
}