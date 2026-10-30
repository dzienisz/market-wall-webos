// Template for a new screen: copy to screens/<name>.js, fill it in, add '<name>' to screens/list.js.
// Not packaged into the app.
(function () {
  F.register({
    id: 'template',
    color: '#5a8dff',
    // A 48x48 icon on a tinted disc, like the other tiles.
    icon: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#5a8dff" fill-opacity=".14"/><circle cx="24" cy="24" r="10" fill="#5a8dff"/></svg>',
    // '<id>.title' and '<id>.desc' are the gallery tile; English is the fallback for any missing string.
    strings: {
      en: { 'template.title': 'Template', 'template.desc': 'What this screen shows, in one line', 'template.src': 'Example source' },
      pl: { 'template.title': 'Szablon', 'template.desc': 'Co pokazuje ten ekran, w jednym zdaniu', 'template.src': 'Przykładowe źródło' }
    },
    html: '<div class="tp-big num" id="tp-big">—</div>',
    // Prefix classes with something short and unique to the screen.
    css: '.tp-big { font-size: 200px; font-weight: 800; padding-top: 120px; }',

    // Optional: handle a remote key and return true; arrows left/right otherwise change screens.
    onKey: function (k, KEY) { return false; },

    start: function (root, F) {
      function refresh() {
        // Fetch through Data so screens share requests; convert prices with Data.fx() into the viewer's currency.
        return Data.fx().then(function (fx) {
          return Assets.cgPrices().then(function (j) {
            F.$('tp-big').textContent = Currency.auto(fx.usd(j.bitcoin.usd), fx.code);
          });
        }).then(function () { F.report([]); }, function () { F.report(['Bitcoin']); });
      }
      F.sources(t('template.src'));
      refresh();
      // Timers through F.every / F.after stop by themselves when the screen is left.
      F.every(refresh, 60 * 1000);
    }
  });
})();
