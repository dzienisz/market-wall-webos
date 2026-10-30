// The currencies prices can be shown in: every one has an ECB reference rate (frankfurter.dev), a Big Mac price
// in The Economist's index, and a World Bank country for the inflation on the What if screen.
var Currency = (function () {
  // code: [symbol, symbol before the number, World Bank country, what-if stake]
  var LIST = {
    USD: ['$', true, 'US', 1000],
    EUR: ['€', true, 'EMU', 1000],
    GBP: ['£', true, 'GB', 1000],
    CHF: ['CHF ', true, 'CH', 1000],
    JPY: ['¥', true, 'JP', 100000],
    CAD: ['C$', true, 'CA', 1000],
    AUD: ['A$', true, 'AU', 1000],
    PLN: [' zł', false, 'PL', 1000],
    CZK: [' Kč', false, 'CZ', 10000],
    HUF: [' Ft', false, 'HU', 100000],
    SEK: [' kr', false, 'SE', 10000],
    NOK: [' kr', false, 'NO', 10000],
    DKK: [' kr', false, 'DK', 10000],
    TRY: ['₺', true, 'TR', 10000],
    INR: ['₹', true, 'IN', 100000],
    BRL: ['R$', true, 'BR', 1000],
    MXN: ['MX$', true, 'MX', 10000],
    CNY: ['CN¥', true, 'CN', 10000]
  };
  var CODES = Object.keys(LIST);

  // Polish writes the euro after the number, like its own złoty.
  function money(value, code, decimals) {
    var c = LIST[code] || LIST.USD, n = I18N.fmt(Math.abs(value), decimals || 0), sign = value < 0 ? '-' : '';
    var before = c[1] && !(I18N.lang() === 'pl' && code === 'EUR');
    return sign + (before ? c[0] + n : n + (c[1] ? ' ' + c[0] : c[0]));
  }
  // Enough decimals to be useful at any size: 0.0821 but 64 210.
  function auto(value, code) {
    var a = Math.abs(value);
    return money(value, code, a >= 1000 ? 0 : a >= 10 ? 2 : a >= 1 ? 3 : 4);
  }

  // Large amounts in words: "$112.01 billion", "644,20 mln zł".
  function big(value, code) {
    var c = LIST[code] || LIST.USD, n = I18N.big(value);
    var before = c[1] && !(I18N.lang() === 'pl' && code === 'EUR');
    return before ? c[0] + n : n + (c[1] ? ' ' + c[0] : c[0]);
  }

  return {
    CODES: CODES, big: big,
    country: function (code) { return (LIST[code] || LIST.USD)[2]; },
    stake: function (code) { return (LIST[code] || LIST.USD)[3]; },
    money: money, auto: auto
  };
})();
