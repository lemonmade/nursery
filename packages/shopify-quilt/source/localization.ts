import {useLocalizedFormatting} from '@quilted/quilt/localize';

export interface MoneyValue {
  amount: string;
  currencyCode: string;
}

export function useFormatMoney() {
  const {formatCurrency} = useLocalizedFormatting();

  return function formatMoney(
    money: MoneyValue,
    options?: Parameters<typeof formatCurrency>[1],
  ) {
    return formatCurrency(money.amount, {
      currency: money.currencyCode,
      ...options,
    });
  };
}
