// webOS 5 ships an old Chromium (~68): no optional chaining, no ??, no flex gap.
// Core: the screen registry, the gallery, remote-control navigation, and helpers every screen shares.
var F = (function () {
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 461, ESC: 27, BACKSPACE: 8 };
  var CHANNEL_MS = 60 * 1000, COLS = 4;
  var screens = [];
  var mode = 'gallery', current = -1, focusIdx = 0, channel = false;
  var timers = [], stopFn = null, channelTimer = null, hintTimer = null;

  I18N.add({
    en: {
      'core.sources': 'Sources: {s}', 'core.updated': 'Updated at {t}', 'core.missing': 'Updated at {t}. No data for {m}, retrying shortly.',
      'core.pick': 'Pick a screen with the arrows and press OK', 'core.hint': 'Left and right change screens, <b>Back</b> opens the gallery',
      'core.hintBack': '<b>Back</b> returns to the gallery',
      'core.channelHint': '<b>Channel</b>: {s}. Back opens the gallery', 'core.fx': 'exchange rates',
      'channel.title': 'Channel', 'channel.desc': 'Every screen in turn, a new one each minute'
    },
    pl: {
      'core.sources': 'Źródła: {s}', 'core.updated': 'Zaktualizowano o {t}', 'core.missing': 'Zaktualizowano o {t}. Brak danych: {m}, ponowię za chwilę.',
      'core.pick': 'Wybierz ekran strzałkami i naciśnij OK', 'core.hint': 'Strzałki w bok zmieniają ekran, <b>Wstecz</b> otwiera galerię',
      'core.hintBack': '<b>Wstecz</b> wraca do galerii',
      'core.channelHint': '<b>Kanał</b>: {s}. Wstecz otwiera galerię', 'core.fx': 'kursy walut',
      'channel.title': 'Kanał', 'channel.desc': 'Wszystkie ekrany po kolei, co minutę następny'
    }
  });

  function $(id) { return document.getElementById(id); }
  var fmt = I18N.fmt;

  // Signed percentage with an arrow, for a .up / .down element.
  function pct(el, p) {
    el.className = (el.className.replace(/\b(up|down|waiting)\b/g, '') + ' ' + (p >= 0 ? 'up' : 'down')).trim();
    el.textContent = (p >= 0 ? '▲ ' : '▼ ') + fmt(Math.abs(p), 2) + '%';
  }

  // Sparkline into an <svg>: a line in `color` over a fading area, a dot on the latest value.
  // The line draws itself once per page load (`animate`), the one bit of motion a screen gets on entry.
  function spark(svg, values, color, w, h, animate) {
    if (!values || values.length < 2) return;
    var pad = 8, n = values.length;
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values), span = max - min || 1;
    var pts = values.map(function (v, i) { return [(i / (n - 1)) * (w - pad), pad + (1 - (v - min) / span) * (h - 2 * pad)]; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
    var area = line + 'L' + pts[n - 1][0].toFixed(1) + ' ' + h + 'L0 ' + h + 'Z';
    var end = pts[n - 1], gid = 'g' + Math.random().toString(36).slice(2, 8);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.innerHTML =
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + color + '" stop-opacity=".38"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<path class="ln" d="' + line + '" fill="none" stroke="' + color + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + end[0] + '" cy="' + end[1] + '" r="13" fill="' + color + '" fill-opacity=".25"/>' +
      '<circle cx="' + end[0] + '" cy="' + end[1] + '" r="6.5" fill="' + color + '"/>';
    if (animate) {
      var ln = svg.querySelector('.ln'), len = ln.getTotalLength();
      ln.style.strokeDasharray = len;
      ln.style.strokeDashoffset = len;
      ln.getBoundingClientRect();
      ln.style.transition = 'stroke-dashoffset 1.6s ease-out';
      ln.style.strokeDashoffset = 0;
    }
  }

  function setStatus(t_) { $('status').textContent = t_ || ''; }
  function setSources(s) { $('sources').textContent = s ? t('core.sources', { s: s }) : ''; }
  function stamp() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  // A screen reports what it couldn't load; the footer says so in one place, the same way everywhere.
  function report(missing) {
    setStatus(missing && missing.length ? t('core.missing', { t: stamp(), m: missing.join(', ') }) : t('core.updated', { t: stamp() }));
  }

  // Timers a screen starts through F.every / F.after are cleared automatically when it's left.
  function every(fn, ms) { timers.push(setInterval(fn, ms)); }
  function after(fn, ms) { timers.push(setTimeout(fn, ms)); }

  // Each opening of a screen gets its own F. Requests still in flight when you move on resolve later;
  // once the screen is gone its F stops writing to the footer, so it can't overwrite the next screen's status.
  var generation = 0;
  function screenContext() {
    var mine = ++generation;
    function alive() { return mine === generation; }
    var ctx = {};
    for (var k in api) ctx[k] = api[k];
    ctx.alive = alive;
    ctx.report = function (m) { if (alive()) report(m); };
    ctx.status = function (s) { if (alive()) setStatus(s); };
    ctx.sources = function (s) { if (alive()) setSources(s); };
    return ctx;
  }

  function clearScreen() {
    generation++;
    timers.forEach(function (x) { clearInterval(x); clearTimeout(x); });
    timers = [];
    if (stopFn) { try { stopFn(); } catch (e) {} stopFn = null; }
    $('view').innerHTML = '';
    setStatus(''); setSources('');
  }

  function injectCss(css) {
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  // A screen: { id, color, icon, html, css, strings, start(root, F), onKey(k, KEY), inChannel }.
  // Its title and gallery description are the strings '<id>.title' and '<id>.desc'.
  function register(def) {
    if (def.strings) I18N.add(def.strings);
    if (def.css) injectCss(def.css);
    screens.push(def);
  }
  function title(s) { return t(s.id + '.title'); }
  function channelScreens() { return screens.filter(function (s) { return s.inChannel !== false; }); }

  // ---- gallery ------------------------------------------------------------------------------------
  var CHANNEL = {
    id: 'channel', color: '#f3f5f9',
    icon: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#f3f5f9" fill-opacity=".10"/><rect x="11" y="15" width="26" height="18" rx="3" fill="none" stroke="#f3f5f9" stroke-width="2.4"/><path d="M21.5 19.5v9l7-4.5z" fill="#f3f5f9"/><path d="M19 37h10" stroke="#f3f5f9" stroke-width="2.4" stroke-linecap="round"/></svg>'
  };
  // Screens in the channel first, then the Channel tile, then the rest (Settings).
  function galleryItems() {
    return channelScreens().concat([CHANNEL]).concat(screens.filter(function (s) { return s.inChannel === false; }));
  }

  function showGallery() {
    stopChannel();
    clearScreen();
    mode = 'gallery';
    var items = galleryItems();
    $('view').innerHTML = '<div class="gallery">' + items.map(function (s, i) {
      return '<div class="tile" data-i="' + i + '"><div class="ic">' + s.icon + '</div><div><h2>' + title(s) + '</h2><p>' + t(s.id + '.desc') + '</p></div></div>';
    }).join('') + '</div>';
    var tiles = $('view').querySelectorAll('.tile');
    for (var i = 0; i < tiles.length; i++) {
      (function (idx) {
        tiles[idx].addEventListener('mouseenter', function () { focusTile(idx); });
        tiles[idx].addEventListener('click', function () { openItem(idx); });
      })(i);
    }
    focusTile(Math.min(focusIdx, items.length - 1));
    setStatus(t('core.pick'));
  }
  function focusTile(i) {
    var tiles = $('view').querySelectorAll('.tile'), items = galleryItems();
    focusIdx = i;
    for (var k = 0; k < tiles.length; k++) {
      var on = k === i;
      tiles[k].className = 'tile' + (on ? ' focus' : '');
      tiles[k].style.borderColor = on ? items[k].color : '';
    }
  }
  function openItem(i) {
    var item = galleryItems()[i];
    if (item === CHANNEL) { startChannel(); return; }
    openScreen(screens.indexOf(item));
  }

  // ---- screens ------------------------------------------------------------------------------------
  function openScreen(i, quiet) {
    clearScreen();
    mode = 'screen';
    current = (i + screens.length) % screens.length;
    var s = screens[current];
    focusIdx = galleryItems().indexOf(channel ? CHANNEL : s);
    try { localStorage.setItem('lastScreen', channel ? 'channel' : s.id); } catch (e) {}
    var root = $('view');
    root.innerHTML = s.html || '';
    var ret = s.start(root, screenContext());
    if (typeof ret === 'function') stopFn = ret;
    if (!quiet) hint(channel ? t('core.channelHint', { s: title(s) }) : s.inChannel === false ? t('core.hintBack') : t('core.hint'));
  }
  // The next screen in the channel's order, from the one showing.
  function stepChannel(dir) {
    var list = channelScreens(), at = list.indexOf(screens[current]);
    return screens.indexOf(list[((at < 0 ? 0 : at) + dir + list.length) % list.length]);
  }
  function startChannel() {
    channel = true;
    openScreen(current < 0 || screens[current].inChannel === false ? screens.indexOf(channelScreens()[0]) : current);
    channelTimer = setInterval(function () { openScreen(stepChannel(1), true); }, CHANNEL_MS);
  }
  function stopChannel() {
    channel = false;
    if (channelTimer) { clearInterval(channelTimer); channelTimer = null; }
  }
  function hint(html) {
    var h = $('hint');
    h.innerHTML = html;
    h.className = 'on';
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { h.className = ''; }, 3500);
  }

  function exitApp() {
    if (window.PalmSystem && window.PalmSystem.platformBack) window.PalmSystem.platformBack();
    else window.close();
  }

  function onKey(e) {
    var k = e.keyCode;
    if (mode === 'gallery') {
      var n = galleryItems().length;
      if (k === KEY.RIGHT) focusTile(Math.min(n - 1, focusIdx + 1));
      else if (k === KEY.LEFT) focusTile(Math.max(0, focusIdx - 1));
      else if (k === KEY.DOWN) focusTile(Math.min(n - 1, focusIdx + COLS));
      else if (k === KEY.UP) focusTile(Math.max(0, focusIdx - COLS));
      else if (k === KEY.OK) openItem(focusIdx);
      else if (k === KEY.BACK || k === KEY.ESC) exitApp();
      else return;
    } else {
      var s = screens[current];
      if (k === KEY.BACK || k === KEY.ESC || k === KEY.BACKSPACE) {
        if (!(s.onKey && s.onKey(k, KEY))) showGallery();
      } else if (s.onKey && s.onKey(k, KEY)) {
        // handled by the screen
      } else if ((k === KEY.RIGHT || k === KEY.LEFT) && s.inChannel !== false) {
        // Moving by hand ends the channel's autoplay: you've taken the remote.
        stopChannel();
        openScreen(stepChannel(k === KEY.RIGHT ? 1 : -1));
      } else return;
    }
    e.preventDefault();
  }

  // ---- clock and OLED care ------------------------------------------------------------------------
  function tick() {
    $('time').textContent = stamp();
    var head = mode === 'screen' ? '<b>' + title(screens[current]) + '</b>, ' : '';
    $('date').innerHTML = head + I18N.longDate(new Date());
  }
  // Shift the whole layout a few pixels every few minutes so nothing sits on the same pixels for hours.
  var OFFSETS = [[0, 0], [6, 4], [-6, 6], [4, -6], [-4, -4], [8, 0], [0, 8]], shiftIdx = 0;
  function shift() {
    shiftIdx = (shiftIdx + 1) % OFFSETS.length;
    $('stage').style.transform = 'translate(' + OFFSETS[shiftIdx][0] + 'px,' + OFFSETS[shiftIdx][1] + 'px)';
  }

  function boot() {
    document.addEventListener('keydown', onKey);
    tick();
    setInterval(tick, 1000);
    setInterval(shift, 3 * 60 * 1000);
    // Reopen whatever was on last time; the gallery is one press of Back away.
    var last = null;
    try { last = localStorage.getItem('lastScreen'); } catch (e) {}
    if (last === 'channel') { startChannel(); return; }
    for (var i = 0; i < screens.length; i++) if (screens[i].id === last) { openScreen(i); return; }
    showGallery();
  }

  var api = {
    register: register, boot: boot, gallery: showGallery,
    every: every, after: after, report: report, status: setStatus, sources: setSources,
    fmt: fmt, pct: pct, spark: spark, $: $, KEY: KEY
  };
  return api;
})();
