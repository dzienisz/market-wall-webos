// Annual net profit of a few well-known companies, for the board's profit counter and the Everyday screen.
// Figures are from each company's annual report (US companies: the 10-K filed with the SEC). Update them
// when a new annual report comes out; `year` is shown next to the number.
var Companies = (function () {
  var LIST = {
    apple: { name: 'Apple', profit: 112010000000, currency: 'USD', year: 'FY2025', source: 'Apple 10-K, year to 27 Sep 2025' },
    microsoft: { name: 'Microsoft', profit: 133749000000, currency: 'USD', year: 'FY2026', source: 'Microsoft 10-K, year to 30 Jun 2026' },
    nvidia: { name: 'Nvidia', profit: 120067000000, currency: 'USD', year: 'FY2026', source: 'Nvidia 10-K, year to 25 Jan 2026' },
    alphabet: { name: 'Alphabet', profit: 132170000000, currency: 'USD', year: '2025', source: 'Alphabet 10-K, 2025' },
    amazon: { name: 'Amazon', profit: 77670000000, currency: 'USD', year: '2025', source: 'Amazon 10-K, 2025' },
    // A Polish broker whose profit became a meme: 644 199 thousand złoty in 2025.
    xtb: { name: 'XTB', profit: 644199000, currency: 'PLN', year: '2025', source: 'XTB annual report 2025' }
  };
  var IDS = Object.keys(LIST);

  // The chosen company, or null when the counter is off.
  function current() { var id = Settings.get('counter'); return LIST[id] ? LIST[id] : null; }

  return { IDS: IDS, get: function (id) { return LIST[id]; }, current: current, perSecond: function (c) { return c.profit / (365 * 24 * 3600); } };
})();
