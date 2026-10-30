// The viewer's choices: language, currency, what's on the board, which company's profit to count.
// Kept in localStorage for the app, and copied to a file the screen saver (QML, no localStorage) can read.
var Settings = (function () {
  var KEY = 'mw:settings';
  var SAVER_DIR = '/var/lib/webosbrew/marketwall';
  var MAX_BOARD = 6;

  // First run: start from the TV's own language and region.
  function guess() {
    var loc = (navigator.language || 'en-US').split('-'), region = (loc[1] || '').toUpperCase();
    var lang = loc[0] === 'pl' ? 'pl' : 'en';
    var EURO = 'AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK';
    var BY_REGION = { US: 'USD', GB: 'GBP', CH: 'CHF', JP: 'JPY', CA: 'CAD', AU: 'AUD', PL: 'PLN', CZ: 'CZK', HU: 'HUF', SE: 'SEK', NO: 'NOK', DK: 'DKK', TR: 'TRY', IN: 'INR', BR: 'BRL', MX: 'MXN', CN: 'CNY' };
    var currency = BY_REGION[region] || (EURO.indexOf(region) >= 0 && region ? 'EUR' : lang === 'pl' ? 'PLN' : 'USD');
    return {
      lang: lang,
      currency: currency,
      board: ['bitcoin', 'gold', 'silver', 'sp500', currency === 'USD' ? 'fx-eur' : 'fx-usd'],
      counter: lang === 'pl' ? 'xtb' : 'apple'
    };
  }

  var s;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!s || !s.lang) s = guess();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    saveForSaver();
  }

  // The screen saver reads this file. Writing it needs root, which the Homebrew Channel's service runs
  // commands as; without the Homebrew Channel the screen saver falls back to its defaults.
  var saverState = 'unknown';
  function saveForSaver(done) {
    if (!window.PalmServiceBridge) { saverState = 'unavailable'; if (done) done(saverState); return; }
    var json = JSON.stringify({ v: 1, lang: s.lang, currency: s.currency, board: s.board });
    var cmd = "mkdir -p " + SAVER_DIR + " && printf '%s\\n' '" + json.replace(/'/g, "'\\''") + "' > " + SAVER_DIR + "/settings.json";
    var bridge = new PalmServiceBridge();
    bridge.onservicecallback = function (msg) {
      var r = {};
      try { r = JSON.parse(msg); } catch (e) {}
      saverState = r.returnValue ? 'saved' : 'failed';
      if (done) done(saverState);
    };
    bridge.call('luna://org.webosbrew.hbchannel.service/exec', JSON.stringify({ command: cmd }));
  }

  return {
    MAX_BOARD: MAX_BOARD,
    get: function (k) { return s[k]; },
    set: function (k, v) { s[k] = v; save(); },
    saverState: function () { return saverState; },
    saveForSaver: saveForSaver
  };
})();
I18N.setLang(Settings.get('lang'));
