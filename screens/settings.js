// Settings: language, currency, the profit counter and what's on the board, all with the remote.
// Up and down move between rows; left and right change a value or move between board tiles; OK picks a tile.
(function () {
  var COLS = 5, FOCUS_KEY = 'mw:settingsFocus';

  F.register({
    id: 'settings',
    inChannel: false,
    color: '#9aa3b5',
    icon: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#9aa3b5" fill-opacity=".12"/><path d="M13 17h22M13 24h22M13 31h22" stroke="#f3f5f9" stroke-width="2.4" stroke-linecap="round"/><circle cx="19" cy="17" r="3.6" fill="#000" stroke="#ff9f1c" stroke-width="2.4"/><circle cx="29" cy="24" r="3.6" fill="#000" stroke="#3ddc97" stroke-width="2.4"/><circle cx="22" cy="31" r="3.6" fill="#000" stroke="#5a8dff" stroke-width="2.4"/></svg>',
    strings: {
      en: {
        'settings.title': 'Settings', 'settings.desc': 'Language, currency and what the board shows',
        'set.lang': 'Language', 'set.currency': 'Currency', 'set.counter': 'Profit counter', 'set.off': 'Off',
        'set.board': 'On the board', 'set.picked': '{n} of {max} picked, in this order',
        'set.saver': 'Screen saver: in Glasshouse, open Screensaver and pick Market Wall. It shows the first four assets on your board.',
        'set.saver.saved': 'Your settings are saved for the screen saver.',
        'set.saver.failed': 'Couldn’t save your settings for the screen saver, so it uses the defaults. It needs the Homebrew Channel.',
        'set.status': 'Left and right change a value, OK picks a board tile, Back returns to the gallery'
      },
      pl: {
        'settings.title': 'Ustawienia', 'settings.desc': 'Język, waluta i to, co pokazuje tablica',
        'set.lang': 'Język', 'set.currency': 'Waluta', 'set.counter': 'Licznik zysku', 'set.off': 'Wyłączony',
        'set.board': 'Na tablicy', 'set.picked': 'Wybrane {n} z {max}, w tej kolejności',
        'set.saver': 'Wygaszacz: w Glasshouse otwórz Screensaver i wybierz Market Wall. Pokazuje pierwsze cztery aktywa z tablicy.',
        'set.saver.saved': 'Ustawienia są zapisane dla wygaszacza.',
        'set.saver.failed': 'Nie udało się zapisać ustawień dla wygaszacza, więc użyje domyślnych. Potrzebny jest Homebrew Channel.',
        'set.status': 'Strzałki w bok zmieniają wartość, OK wybiera kafelek tablicy, Wstecz wraca do galerii'
      }
    },
    css: [
      '.st-opt { display: flex; justify-content: space-between; align-items: center; height: 84px; padding: 0 28px; border-radius: 22px; border: 2px solid transparent; }',
      '.st-opt.focus { border-color: #9aa3b5; background: #0b0d12; }',
      '.st-label { font-size: 38px; font-weight: 600; } .st-val { font-size: 38px; color: var(--muted); white-space: nowrap; }',
      '.st-opt.focus .st-val { color: var(--ink); }',
      // Arrows drawn with borders: the bundled font has no ‹ › glyphs.
      '.st-val i { display: inline-block; width: 0; height: 0; border-top: 9px solid transparent; border-bottom: 9px solid transparent; margin: 0 22px; vertical-align: 4px; opacity: .35; }',
      '.st-val i.l { border-right: 12px solid #9aa3b5; } .st-val i.r { border-left: 12px solid #9aa3b5; } .st-opt.focus .st-val i { opacity: 1; }',
      '.st-head { display: flex; justify-content: space-between; align-items: baseline; margin: 26px 28px 14px; }',
      '.st-head b { font-size: 34px; font-weight: 600; } .st-head span { font-size: 26px; color: var(--muted); }',
      '.st-grid { display: grid; grid-template-columns: repeat(5, 1fr); grid-auto-rows: 84px; grid-gap: 14px; }',
      '.st-chip { position: relative; display: flex; align-items: center; padding: 0 18px; border-radius: 20px; border: 2px solid #1b1f27; background: #05070a; }',
      '.st-chip svg { width: 52px; height: 52px; flex: none; margin-right: 14px; }',
      '.st-chip .nm { font-size: 28px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--muted); }',
      '.st-chip.on .nm { color: var(--ink); font-weight: 600; }',
      '.st-chip .ord { position: absolute; right: 12px; top: 10px; font-size: 20px; font-weight: 800; color: #000; border-radius: 12px; min-width: 24px; height: 24px; line-height: 24px; text-align: center; }',
      '.st-chip.focus { border-color: #f3f5f9; transform: scale(1.04); }',
      '.st-saver { font-size: 25px; color: var(--muted); margin: 24px 28px 0; line-height: 1.35; max-width: 1500px; }'
    ].join('\n'),

    start: function (root, F) {
      var $ = F.$, self = this;
      var cur = Settings.get('currency');
      var chips = Assets.LIST.filter(function (a) { return !(a.kind === 'fx' && a.code === cur); });
      var counters = [''].concat(Companies.IDS);
      var OPTS = [
        { key: 'lang', label: t('set.lang'), values: I18N.LANGS.map(function (l) { return l.code; }), show: function (v) { for (var i = 0; i < I18N.LANGS.length; i++) if (I18N.LANGS[i].code === v) return I18N.LANGS[i].name; }, reload: true },
        { key: 'currency', label: t('set.currency'), values: Currency.CODES, show: function (v) { return v + '  ' + Currency.money(1, v, 0).replace(/1/, '').trim(); }, reload: true },
        { key: 'counter', label: t('set.counter'), values: counters, show: function (v) { return v ? Companies.get(v).name : t('set.off'); } }
      ];
      var focus = 0;
      try { focus = parseInt(localStorage.getItem(FOCUS_KEY), 10) || 0; } catch (e) {}
      focus = Math.min(focus, OPTS.length + chips.length - 1);

      root.innerHTML = OPTS.map(function (o, i) {
        return '<div class="st-opt" id="st-o' + i + '"><div class="st-label">' + o.label + '</div><div class="st-val" id="st-v' + i + '"></div></div>';
      }).join('') +
        '<div class="st-head"><b>' + t('set.board') + '</b><span id="st-count"></span></div>' +
        '<div class="st-grid">' + chips.map(function (a, i) {
          return '<div class="st-chip" id="st-c' + i + '">' + a.icon + '<div class="nm">' + a.name() + '</div><div class="ord" id="st-n' + i + '"></div></div>';
        }).join('') + '</div>' +
        '<div class="st-saver"><span>' + t('set.saver') + '</span> <span id="st-saved"></span></div>';

      function render() {
        OPTS.forEach(function (o, i) {
          $('st-v' + i).innerHTML = '<i class="l"></i>' + o.show(Settings.get(o.key) || '') + '<i class="r"></i>';
          $('st-o' + i).className = 'st-opt' + (focus === i ? ' focus' : '');
        });
        var board = Settings.get('board') || [];
        chips.forEach(function (a, i) {
          var at = board.indexOf(a.id), el = $('st-c' + i), n = $('st-n' + i);
          el.className = 'st-chip' + (at >= 0 ? ' on' : '') + (focus === OPTS.length + i ? ' focus' : '');
          el.style.borderColor = at >= 0 && focus !== OPTS.length + i ? a.color : '';
          n.textContent = at >= 0 ? at + 1 : '';
          n.style.background = at >= 0 ? a.color : 'transparent';
        });
        $('st-count').textContent = t('set.picked', { n: board.filter(function (id) { return chips.some(function (a) { return a.id === id; }); }).length, max: Settings.MAX_BOARD });
        try { localStorage.setItem(FOCUS_KEY, focus); } catch (e) {}
      }

      function change(o, dir) {
        var vals = o.values, at = vals.indexOf(Settings.get(o.key) || '');
        Settings.set(o.key, vals[(at + dir + vals.length) % vals.length]);
        // Language and currency change every string and price, so the app starts again on this screen.
        if (o.reload) { location.reload(); return; }
        render();
      }
      function toggle(a) {
        var board = (Settings.get('board') || []).slice(), at = board.indexOf(a.id);
        if (at >= 0) board.splice(at, 1);
        else if (board.length < Settings.MAX_BOARD) board.push(a.id);
        else return;
        Settings.set('board', board);
        render();
      }

      self._key = function (k, KEY) {
        var n = OPTS.length, total = n + chips.length;
        if (focus < n) {
          if (k === KEY.UP) focus = Math.max(0, focus - 1);
          else if (k === KEY.DOWN) focus = Math.min(total - 1, focus + 1);
          else if (k === KEY.LEFT || k === KEY.RIGHT) { change(OPTS[focus], k === KEY.RIGHT ? 1 : -1); return true; }
          else return false;
        } else {
          var c = focus - n;
          if (k === KEY.LEFT) focus = n + Math.max(0, c - 1);
          else if (k === KEY.RIGHT) focus = n + Math.min(chips.length - 1, c + 1);
          else if (k === KEY.UP) focus = c < COLS ? n - 1 : focus - COLS;
          else if (k === KEY.DOWN) focus = n + Math.min(chips.length - 1, c + COLS);
          else if (k === KEY.OK) { toggle(chips[c]); return true; }
          else return false;
        }
        render();
        return true;
      };

      render();
      F.status(t('set.status'));
      Settings.saveForSaver(function (state) {
        if (!F.alive()) return;
        // 'unavailable' is a desktop browser, not a TV: nothing to say there.
        $('st-saved').textContent = state === 'saved' ? t('set.saver.saved') : state === 'failed' ? t('set.saver.failed') : '';
      });
      return function () { self._key = null; };
    },

    onKey: function (k, KEY) { return this._key ? this._key(k, KEY) : false; }
  });
})();
