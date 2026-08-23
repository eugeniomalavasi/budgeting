// Valute principali proposte nel selettore (input movimento + valuta di famiglia).
// `decimals` = cifre decimali tipiche della valuta (0 per quelle senza sub-unità,
// es. JPY, UZS, KRW, VND). `symbol` è puramente estetico per il selettore.
// I tassi di cambio vivono nella tabella `exchange_rates` (base EUR).
export const CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'USD', name: 'Dollaro USA', symbol: '$', decimals: 2 },
  { code: 'GBP', name: 'Sterlina', symbol: '£', decimals: 2 },
  { code: 'CHF', name: 'Franco svizzero', symbol: 'Fr', decimals: 2 },
  { code: 'JPY', name: 'Yen giapponese', symbol: '¥', decimals: 0 },
  { code: 'CNY', name: 'Yuan cinese', symbol: '¥', decimals: 2 },
  { code: 'UZS', name: 'Som uzbeko', symbol: 'soʻm', decimals: 0 },
  { code: 'RUB', name: 'Rublo russo', symbol: '₽', decimals: 2 },
  { code: 'TRY', name: 'Lira turca', symbol: '₺', decimals: 2 },
  { code: 'AED', name: 'Dirham (Emirati)', symbol: 'د.إ', decimals: 2 },
  { code: 'INR', name: 'Rupia indiana', symbol: '₹', decimals: 2 },
  { code: 'CAD', name: 'Dollaro canadese', symbol: '$', decimals: 2 },
  { code: 'AUD', name: 'Dollaro australiano', symbol: '$', decimals: 2 },
  { code: 'NZD', name: 'Dollaro neozelandese', symbol: '$', decimals: 2 },
  { code: 'SEK', name: 'Corona svedese', symbol: 'kr', decimals: 2 },
  { code: 'NOK', name: 'Corona norvegese', symbol: 'kr', decimals: 2 },
  { code: 'DKK', name: 'Corona danese', symbol: 'kr', decimals: 2 },
  { code: 'PLN', name: 'Złoty polacco', symbol: 'zł', decimals: 2 },
  { code: 'CZK', name: 'Corona ceca', symbol: 'Kč', decimals: 2 },
  { code: 'HUF', name: 'Fiorino ungherese', symbol: 'Ft', decimals: 0 },
  { code: 'RON', name: 'Leu rumeno', symbol: 'lei', decimals: 2 },
  { code: 'BRL', name: 'Real brasiliano', symbol: 'R$', decimals: 2 },
  { code: 'MXN', name: 'Peso messicano', symbol: '$', decimals: 2 },
  { code: 'ZAR', name: 'Rand sudafricano', symbol: 'R', decimals: 2 },
  { code: 'SGD', name: 'Dollaro di Singapore', symbol: '$', decimals: 2 },
  { code: 'HKD', name: 'Dollaro di Hong Kong', symbol: '$', decimals: 2 },
  { code: 'THB', name: 'Baht thailandese', symbol: '฿', decimals: 2 },
  { code: 'KRW', name: 'Won sudcoreano', symbol: '₩', decimals: 0 },
  { code: 'IDR', name: 'Rupia indonesiana', symbol: 'Rp', decimals: 0 },
  { code: 'MYR', name: 'Ringgit malese', symbol: 'RM', decimals: 2 },
  { code: 'PHP', name: 'Peso filippino', symbol: '₱', decimals: 2 },
  { code: 'VND', name: 'Dong vietnamita', symbol: '₫', decimals: 0 },
  { code: 'EGP', name: 'Sterlina egiziana', symbol: '£', decimals: 2 },
  { code: 'ILS', name: 'Shekel israeliano', symbol: '₪', decimals: 2 },
  { code: 'SAR', name: 'Riyal saudita', symbol: '﷼', decimals: 2 },
  { code: 'UAH', name: 'Grivnia ucraina', symbol: '₴', decimals: 2 },
  { code: 'KZT', name: 'Tenge kazako', symbol: '₸', decimals: 2 },
  { code: 'GEL', name: 'Lari georgiano', symbol: '₾', decimals: 2 },
  { code: 'MAD', name: 'Dirham marocchino', symbol: 'د.م.', decimals: 2 },
]

const BY_CODE = Object.fromEntries(CURRENCIES.map(c => [c.code, c]))

// Info valuta (fallback ragionevole per codici non in lista).
export function currencyInfo(code) {
  return BY_CODE[code] || { code, name: code, symbol: code, decimals: 2 }
}

export function currencySymbol(code) {
  return currencyInfo(code).symbol
}

export function currencyDecimals(code) {
  return currencyInfo(code).decimals
}
