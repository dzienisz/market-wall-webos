// Translations and number formatting. Each screen brings its own strings (F.register({ strings: ... })),
// so adding a screen or a language never means editing one big file.
var I18N = (function () {
  var dict = { en: {}, pl: {} };
  var lang = 'en';

  var LANGS = [
    { code: 'en', name: 'English' },
    { code: 'pl', name: 'Polski' }
  ];

  function add(strings) {
    for (var l in strings) {
      if (!dict[l]) dict[l] = {};
      for (var k in strings[l]) dict[l][k] = strings[l][k];
    }
  }

  function setLang(l) { lang = dict[l] ? l : 'en'; document.documentElement.lang = lang; }

  // t('key', { n: 3 }) -> the string in the current language (English if missing), {n} filled in.
  function t(key, vars) {
    var s = dict[lang][key];
    if (s === undefined) s = dict.en[key];
    if (s === undefined) return key;
    return s.replace(/\{(\w+)\}/g, function (_, k) { return vars && vars[k] !== undefined ? vars[k] : ''; });
  }

  // Plural forms: English [one, other], Polish [one, few, many] (1 kebab, 2-4 kebaby, 5+ kebabów, 12-14 kebabów).
  function plural(n, forms) {
    n = Math.abs(Math.round(n));
    if (lang === 'pl') {
      if (n === 1) return forms[0];
      var d = n % 10, h = n % 100;
      return d >= 2 && d <= 4 && (h < 12 || h > 14) ? forms[1] : forms[2];
    }
    return n === 1 ? forms[0] : forms[1];
  }
  // A unit's forms in the current language: { en: [...], pl: [...] }.
  function unit(n, forms) { return plural(n, forms[lang] || forms.en); }

  // Own formatting: the TV's Intl data may lack the locale. English 1,234.56, Polish 1 234,56.
  function fmt(n, decimals) {
    var parts = Math.abs(n).toFixed(decimals || 0).split('.');
    var sep = lang === 'pl' ? ' ' : ',', dec = lang === 'pl' ? ',' : '.';
    var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return (n < 0 ? '-' : '') + (parts[1] ? whole + dec + parts[1] : whole);
  }

  // Large amounts as "1.25 trillion" / "1,25 bln": the words differ, and Polish "bilion" is the English trillion.
  function big(n, decimals) {
    var steps = lang === 'pl'
      ? [[1e12, 'bln'], [1e9, 'mld'], [1e6, 'mln'], [1e3, 'tys.']]
      : [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
    for (var i = 0; i < steps.length; i++) {
      if (Math.abs(n) >= steps[i][0]) return fmt(n / steps[i][0], decimals === undefined ? 2 : decimals) + ' ' + steps[i][1];
    }
    return fmt(n, 0);
  }

  var DAYS = {
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    pl: ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota']
  };
  var MONTHS = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    pl: ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
  };
  function longDate(d) {
    return (DAYS[lang] || DAYS.en)[d.getDay()] + ', ' + d.getDate() + ' ' + (MONTHS[lang] || MONTHS.en)[d.getMonth()];
  }
  // 2026-10-28 -> "28 Oct" / "28.10"
  function shortDate(iso) {
    var p = iso.split('-');
    if (lang === 'pl') return p[2] + '.' + p[1];
    return parseInt(p[2], 10) + ' ' + MONTHS.en[parseInt(p[1], 10) - 1].slice(0, 3);
  }
  function fullDate(iso) {
    var p = iso.split('-');
    if (lang === 'pl') return p[2] + '.' + p[1] + '.' + p[0];
    return parseInt(p[2], 10) + ' ' + MONTHS.en[parseInt(p[1], 10) - 1].slice(0, 3) + ' ' + p[0];
  }

  return {
    LANGS: LANGS, add: add, setLang: setLang, t: t, plural: plural, unit: unit, fmt: fmt, big: big,
    longDate: longDate, shortDate: shortDate, fullDate: fullDate,
    lang: function () { return lang; }
  };
})();
var t = I18N.t;
