// Shared data layer: every screen fetches through here, so screens that need the same data share one request,
// and CoinGecko's free tier (which rejects bursts) only ever sees one call every few seconds.
var Data = (function () {
  var MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  var CG_GAP_MS = 7000;
  var mem = {};
  var cgChain = Promise.resolve(), cgLast = 0;

  function withTimeout(p) {
    var t = new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, 20000); });
    return Promise.race([p, t]);
  }
  function fetchRaw(url, asText) {
    return withTimeout(fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return asText ? r.text() : r.json();
    }));
  }
  function queued(url, asText) {
    if (url.indexOf('api.coingecko.com') < 0) return fetchRaw(url, asText);
    var p = cgChain.then(function () {
      var wait = Math.max(0, cgLast + CG_GAP_MS - Date.now());
      return new Promise(function (res) { setTimeout(res, wait); });
    }).then(function () { cgLast = Date.now(); return fetchRaw(url, asText); });
    cgChain = p.catch(function () {});
    return p;
  }

  // Data kept for an hour or more also survives an app restart (localStorage).
  function get(url, ttl, asText) {
    var now = Date.now(), m = mem[url];
    if (m && m.val !== undefined && now - m.t < ttl) return Promise.resolve(m.val);
    if (m && m.pending) return m.pending;
    if (ttl >= HOUR) {
      try {
        var s = JSON.parse(localStorage.getItem('d:' + url));
        if (s && now - s.t < ttl) { mem[url] = { t: s.t, val: s.v }; return Promise.resolve(s.v); }
      } catch (e) {}
    }
    var old = m;
    var pending = queued(url, asText).then(function (v) {
      mem[url] = { t: Date.now(), val: v };
      if (ttl >= HOUR) { try { localStorage.setItem('d:' + url, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {} }
      return v;
    }, function (err) {
      // A failed refresh keeps showing the last good value rather than blanking the screen.
      if (old && old.val !== undefined) { mem[url] = old; return old.val; }
      delete mem[url];
      throw err;
    });
    mem[url] = { t: old ? old.t : 0, val: old ? old.val : undefined, pending: pending };
    return pending;
  }

  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
  function today() { return ymd(new Date()); }

  // FRED CSV -> [[date, value], ...], dropping the "." FRED writes for days without a value.
  // FRED sends no CORS header: fine in an installed webOS app, which doesn't enforce CORS, not in a desktop browser.
  function fred(id, from, to, ttl) {
    var url = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + id + '&cosd=' + from + (to ? '&coed=' + to : '');
    return get(url, ttl, true).then(function (csv) {
      return csv.trim().split('\n').slice(1).map(function (l) { return l.split(','); })
        .filter(function (r) { return r[1] && r[1] !== '.'; })
        .map(function (r) { return [r[0], parseFloat(r[1])]; });
    });
  }

  // ECB reference rates, as units of each currency per US dollar ({ USD: 1, EUR: 0.86, PLN: 3.65, ... }).
  function rates(date) {
    var url = 'https://api.frankfurter.dev/v1/' + (date || 'latest') + '?from=USD';
    return get(url, date ? 3650 * DAY : 30 * MIN, false).then(function (j) {
      var r = {};
      for (var k in j.rates) r[k] = j.rates[k];
      r.USD = 1;
      r._date = j.date;
      return r;
    });
  }
  // A converter into the viewer's currency: fx.from(value, 'PLN'), fx.usd(value), fx.code, fx.rate (per dollar).
  function fx(date) {
    var code = Settings.get('currency');
    return rates(date).then(function (r) {
      var to = r[code] || 1;
      return {
        code: r[code] ? code : 'USD',
        rate: to,
        date: r._date,
        usd: function (v) { return v * to; },
        from: function (v, cur) { return v / (r[cur] || 1) * to; }
      };
    });
  }

  return {
    MIN: MIN, HOUR: HOUR, DAY: DAY, FOREVER: 3650 * DAY,
    json: function (url, ttl) { return get(url, ttl, false); },
    text: function (url, ttl) { return get(url, ttl, true); },
    fred: fred, rates: rates, fx: fx,
    ymd: ymd, addDays: addDays, today: today
  };
})();
