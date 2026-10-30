// Board: a row per asset (picked in Settings) with price, change and a sparkline, plus a company's profit counter.
(function () {
  var MAX_PRICE_W = 430;

  F.register({
    id: 'board',
    color: '#ff9f1c',
    icon: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#ff9f1c" fill-opacity=".14"/><path d="M12 17h10M12 24h10M12 31h10" stroke="#f3f5f9" stroke-width="2.6" stroke-linecap="round"/><path d="M26 19l4 3 4-5 4 2M26 26l4 2 4-3 4 1M26 33l4-2 4 1 4-3" fill="none" stroke="#ff9f1c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    strings: {
      en: {
        'board.title': 'Board', 'board.desc': 'Your assets with prices, changes and 30-day charts',
        'board.empty': 'The board is empty. Pick what to show in Settings.',
        'board.lead': '{c}’s net profit in {y}, {m} a minute', 'board.since': 'and since you started watching',
        'board.src': 'CoinGecko, gold-api.com, FRED, ECB', 'board.srcReport': '{c} annual report'
      },
      pl: {
        'board.title': 'Tablica notowań', 'board.desc': 'Twoje aktywa z cenami, zmianami i wykresami z 30 dni',
        'board.empty': 'Tablica jest pusta. Wybierz, co pokazać, w Ustawieniach.',
        'board.lead': '{c} zarobiło na czysto w {y}, czyli {m} na minutę', 'board.since': 'a odkąd tu patrzysz',
        'board.src': 'CoinGecko, gold-api.com, FRED, EBC', 'board.srcReport': 'raport roczny {c}'
      }
    },
    css: [
      '.tb-row { display: grid; grid-template-columns: 84px 1fr 430px 210px 520px; grid-column-gap: 32px; align-items: center; height: 118px; border-top: 1px solid var(--rule); }',
      '.tb.dense .tb-row { height: 100px; }',
      '.tb-row:last-child { border-bottom: 1px solid var(--rule); }',
      '.tb-icon svg { width: 84px; height: 84px; display: block; } .tb.dense .tb-icon svg { width: 72px; height: 72px; }',
      '.tb-name { font-size: 46px; font-weight: 600; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.tb-sub { font-size: 26px; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.tb-price { font-size: 84px; font-weight: 800; letter-spacing: -1.5px; text-align: right; white-space: nowrap; transition: color .6s ease; }',
      '.tb-price.flash-up { color: var(--up); transition: none; } .tb-price.flash-down { color: var(--down); transition: none; }',
      '.tb-change { text-align: right; } .tb-pct { font-size: 38px; font-weight: 800; white-space: nowrap; } .tb-period { font-size: 22px; color: var(--muted); margin-top: 2px; }',
      '.tb-range { font-size: 20px; color: var(--muted); margin-bottom: 6px; } .tb-spark { width: 520px; height: 74px; display: block; overflow: visible; }',
      '.tb.dense .tb-spark { height: 62px; }',
      '.tb-empty { font-size: 44px; color: var(--muted); padding-top: 140px; }',
      '.tb-band { margin-top: 30px; height: 190px; border-radius: 40px; padding: 0 56px; display: flex; align-items: center; justify-content: space-between;',
      '  background: radial-gradient(ellipse 60% 140% at 100% 50%, rgba(52,226,122,.20), rgba(52,226,122,0) 70%), #050d08; }',
      '.tb.dense + .tb-band { margin-top: 22px; height: 170px; }',
      '.tb-lead { font-size: 30px; color: #9fb8a8; } .tb-year { font-size: 76px; font-weight: 800; letter-spacing: -1.5px; margin-top: 6px; white-space: nowrap; }',
      '.tb-right { text-align: right; } .tb-counter { font-size: 112px; font-weight: 800; letter-spacing: -3px; line-height: 1; color: #34e27a; text-shadow: 0 0 40px rgba(52,226,122,.35); white-space: nowrap; }'
    ].join('\n'),

    start: function (root, F) {
      var $ = F.$, missing = {}, last = {};
      var list = Assets.board(), company = Companies.current();
      var dense = list.length > 5;

      if (!list.length) { root.innerHTML = '<div class="tb-empty">' + t('board.empty') + '</div>'; return; }

      root.innerHTML = '<div class="tb' + (dense ? ' dense' : '') + '">' + list.map(function (a) {
        return '<div class="tb-row"><div class="tb-icon">' + a.icon + '</div>' +
          '<div><div class="tb-name">' + a.name() + '</div><div class="tb-sub" id="tb-' + a.id + '-sub" style="color:' + a.color + '">&nbsp;</div></div>' +
          '<div class="tb-price num waiting" id="tb-' + a.id + '-price">—</div>' +
          '<div class="tb-change"><div class="tb-pct waiting" id="tb-' + a.id + '-pct">—</div><div class="tb-period" id="tb-' + a.id + '-period">&nbsp;</div></div>' +
          '<div><div class="tb-range" id="tb-' + a.id + '-range">&nbsp;</div><svg class="tb-spark" id="tb-' + a.id + '-spark"></svg></div></div>';
      }).join('') + '</div>' + (company
        ? '<div class="tb-band"><div><div class="tb-lead" id="tb-lead">&nbsp;</div><div class="tb-year num" id="tb-year">—</div></div>' +
          '<div class="tb-right"><div class="tb-lead">' + t('board.since') + '</div><div class="tb-counter num" id="tb-counter">—</div></div></div>'
        : '');

      // A price that changes flashes green or red for a moment, so a glance shows what just moved.
      function price(a, q) {
        var el = $('tb-' + a.id + '-price');
        if (last[a.id] !== undefined && q.value !== last[a.id]) {
          el.className = 'tb-price num ' + (q.value > last[a.id] ? 'flash-up' : 'flash-down');
          setTimeout(function () { el.className = 'tb-price num'; }, 60);
        } else el.className = 'tb-price num';
        last[a.id] = q.value;
        el.textContent = q.text;
        // A long price (bitcoin in yen) shrinks to fit its column instead of pushing the change out.
        el.style.fontSize = Math.min(84, Math.floor(MAX_PRICE_W / (q.text.length * 0.56))) + 'px';
      }

      function quotes(fx) {
        return Promise.all(list.map(function (a) {
          return a.quote(fx).then(function (q) {
            price(a, q);
            $('tb-' + a.id + '-sub').textContent = q.sub || '';
            $('tb-' + a.id + '-period').textContent = q.period || '';
            if (q.change !== null && q.change !== undefined) F.pct($('tb-' + a.id + '-pct'), q.change);
            delete missing[a.name()];
          }).catch(function () { missing[a.name()] = true; });
        })).then(function () { F.report(Object.keys(missing)); });
      }

      function charts(animate) {
        list.forEach(function (a) {
          a.history().then(function (h) {
            $('tb-' + a.id + '-range').textContent = h.label;
            F.spark($('tb-' + a.id + '-spark'), h.values, a.color, 520, dense ? 62 : 74, animate);
          }).catch(function () {});
        });
      }

      // The profit counter: a company's yearly net profit, and how much of it it "made" while you've been looking.
      var openedAt = Date.now();
      function band(fx) {
        if (!company) return;
        var perSec = fx.from(Companies.perSecond(company), company.currency);
        $('tb-lead').textContent = t('board.lead', { c: company.name, y: company.year, m: Currency.money(perSec * 60, fx.code, 0) });
        $('tb-year').textContent = Currency.big(fx.from(company.profit, company.currency), fx.code);
        function counter() { $('tb-counter').textContent = Currency.money((Date.now() - openedAt) / 1000 * perSec, fx.code, 0); }
        counter();
        F.every(counter, 1000);
      }

      function refresh() {
        return Data.fx().then(quotes, function () { missing[t('core.fx')] = true; F.report(Object.keys(missing)); });
      }

      F.sources(t('board.src') + (company ? ', ' + t('board.srcReport', { c: company.name }) : ''));
      // Prices before charts: CoinGecko calls queue 7 s apart, and the price call is the one you look at.
      Assets.cgPrices().catch(function () {});
      Data.fx().then(band).catch(function () {});
      refresh().then(function () { charts(true); });
      F.every(refresh, 60 * 1000);
      F.every(function () { charts(false); }, 30 * Data.MIN);
    }
  });
})();
