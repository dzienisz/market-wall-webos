/*
 * Market Wall screen saver.
 *
 * A clock and the first four assets from the board, in the viewer's language and currency. Glasshouse lists
 * any installed app with assets/screensaver-main.qml under its Screensaver tab and stages only this file, so
 * everything else is loaded by full path: the fonts from the app's folder, the settings from the file the
 * app writes to /var/lib/webosbrew/marketwall (QML can't read the app's localStorage).
 *
 * OLED care: pure black, nothing at full white, and the whole block fades out and moves somewhere else
 * every minute, so no pixel shows the same thing for long.
 */
import QtQuick 2.4
import Eos.Window 0.1

WebOSWindow {
    id: win

    width: 1920
    height: 1080
    windowType: "_WEBOS_WINDOW_TYPE_SCREENSAVER"
    appId: "com.webos.app.screensaver"
    title: "Screen Saver"
    visible: true
    color: "black"

    property string appDir: "file:///media/developer/apps/usr/palm/applications/io.github.dzienisz.marketwall/"
    property string settingsFile: "file:///var/lib/webosbrew/marketwall/settings.json"

    FontLoader { id: heavy; source: win.appDir + "fonts/Bricolage-800.ttf" }
    FontLoader { id: semi; source: win.appDir + "fonts/Bricolage-600.ttf" }
    FontLoader { id: light; source: win.appDir + "fonts/Bricolage-400.ttf" }

    property var cfg: ({ lang: "en", currency: "USD", board: ["bitcoin", "gold", "sp500", "fx-eur"] })
    property var rows: []
    property string clock: ""
    property string dateText: ""

    // ---- what each board id means (the same ids as the app's src/assets.js) ----------------------------
    property var assets: ({
        "bitcoin": { k: "cg", cg: "bitcoin", n: "Bitcoin", c: "#ff9f1c" },
        "ethereum": { k: "cg", cg: "ethereum", n: "Ethereum", c: "#8c9eff" },
        "solana": { k: "cg", cg: "solana", n: "Solana", c: "#b77dff" },
        "xrp": { k: "cg", cg: "ripple", n: "XRP", c: "#5ad1e6" },
        "bnb": { k: "cg", cg: "binancecoin", n: "BNB", c: "#f3ba2f" },
        "dogecoin": { k: "cg", cg: "dogecoin", n: "Dogecoin", c: "#d9b45a" },
        "cardano": { k: "cg", cg: "cardano", n: "Cardano", c: "#5a8dff" },
        "gold": { k: "metal", sym: "XAU", cg: "pax-gold", n: { en: "Gold", pl: "Złoto" }, c: "#ffd23f" },
        "silver": { k: "metal", sym: "XAG", cg: "kinesis-silver", n: { en: "Silver", pl: "Srebro" }, c: "#a9c4ee" },
        "sp500": { k: "fred", f: "SP500", n: "S&P 500", c: "#5a8dff" },
        "nasdaq": { k: "fred", f: "NASDAQCOM", n: "Nasdaq", c: "#3ddc97" },
        "dow": { k: "fred", f: "DJIA", n: "Dow Jones", c: "#7fb2ff" },
        "nikkei": { k: "fred", f: "NIKKEI225", n: "Nikkei 225", c: "#ff7a90" },
        "brent": { k: "fred", f: "DCOILBRENTEU", n: { en: "Brent crude", pl: "Ropa Brent" }, c: "#e07a5f", money: true },
        "fx-usd": { k: "fx", code: "USD", n: { en: "US dollar", pl: "Dolar" }, c: "#c77dff" },
        "fx-eur": { k: "fx", code: "EUR", n: { en: "Euro", pl: "Euro" }, c: "#6c9dff" },
        "fx-gbp": { k: "fx", code: "GBP", n: { en: "British pound", pl: "Funt" }, c: "#ff8fab" },
        "fx-chf": { k: "fx", code: "CHF", n: { en: "Swiss franc", pl: "Frank szwajcarski" }, c: "#ff5c5c" },
        "fx-jpy": { k: "fx", code: "JPY", n: { en: "Japanese yen", pl: "Jen" }, c: "#f6f1e9" },
        "fx-cny": { k: "fx", code: "CNY", n: { en: "Chinese yuan", pl: "Juan" }, c: "#ff6b4a" }
    })
    // code: [symbol, before the number]
    property var symbols: ({
        USD: ["$", true], EUR: ["€", true], GBP: ["£", true], CHF: ["CHF ", true], JPY: ["¥", true],
        CAD: ["C$", true], AUD: ["A$", true], PLN: [" zł", false], CZK: [" Kč", false], HUF: [" Ft", false],
        SEK: [" kr", false], NOK: [" kr", false], DKK: [" kr", false], TRY: ["₺", true], INR: ["₹", true],
        BRL: ["R$", true], MXN: ["MX$", true], CNY: ["CN¥", true]
    })

    // ---- the block that wanders -------------------------------------------------------------------------
    Item {
        id: block
        width: 1060
        height: col.height
        x: 180
        y: 160
        opacity: 0
        Behavior on opacity { NumberAnimation { duration: 1200 } }

        Column {
            id: col
            width: parent.width

            Text {
                text: win.clock
                font.family: heavy.name
                font.weight: Font.ExtraBold
                font.pixelSize: 210
                color: "#d4d8e0"
            }
            Text {
                text: win.dateText
                font.family: light.name
                font.weight: Font.Normal
                font.pixelSize: 40
                color: "#6f7889"
            }
            Item { width: 1; height: 44 }
            Repeater {
                model: win.rows
                delegate: Item {
                    width: col.width
                    height: 92
                    Rectangle {
                        width: 16; height: 16; radius: 8
                        color: modelData.color
                        opacity: 0.85
                        anchors.verticalCenter: parent.verticalCenter
                    }
                    Text {
                        x: 40
                        anchors.verticalCenter: parent.verticalCenter
                        text: modelData.name
                        font.family: semi.name
                        font.weight: Font.DemiBold
                        font.pixelSize: 42
                        color: "#aeb4c0"
                    }
                    Text {
                        anchors.right: parent.right
                        anchors.rightMargin: 230
                        anchors.verticalCenter: parent.verticalCenter
                        text: modelData.price
                        font.family: heavy.name
                        font.weight: Font.ExtraBold
                        font.pixelSize: 58
                        color: "#d4d8e0"
                    }
                    Text {
                        anchors.right: parent.right
                        anchors.verticalCenter: parent.verticalCenter
                        text: modelData.change
                        font.family: heavy.name
                        font.weight: Font.ExtraBold
                        font.pixelSize: 38
                        color: modelData.up ? "#2c9c6c" : "#b8455d"
                    }
                }
            }
        }
    }

    // ---- formatting ---------------------------------------------------------------------------------------
    function nameOf(a) { return typeof a.n === "string" ? a.n : (a.n[cfg.lang] || a.n.en); }
    function fmt(n, d) {
        var parts = Math.abs(n).toFixed(d || 0).split(".");
        var pl = cfg.lang === "pl";
        var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, pl ? " " : ",");
        return (n < 0 ? "-" : "") + (parts[1] ? whole + (pl ? "," : ".") + parts[1] : whole);
    }
    function money(v, code) {
        var a = Math.abs(v), d = a >= 1000 ? 0 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
        var s = symbols[code] || symbols.USD, n = fmt(v, d);
        var before = s[1] && !(cfg.lang === "pl" && code === "EUR");
        return before ? s[0] + n : n + (s[1] ? " " + s[0] : s[0]);
    }
    function pct(p) { return (p >= 0 ? "▲ " : "▼ ") + fmt(Math.abs(p), 2) + "%"; }

    property var days: ({
        en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        pl: ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"]
    })
    property var months: ({
        en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        pl: ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"]
    })
    function tick() {
        var d = new Date(), l = days[cfg.lang] ? cfg.lang : "en";
        clock = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
        dateText = days[l][d.getDay()] + ", " + d.getDate() + " " + months[l][d.getMonth()];
    }

    // ---- data ---------------------------------------------------------------------------------------------
    // A local file answers with status 0, a web request with 200.
    function get(url, asText, done, fail) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== XMLHttpRequest.DONE) return;
            if ((xhr.status === 200 || (xhr.status === 0 && url.indexOf("file:") === 0)) && xhr.responseText) {
                var v = xhr.responseText;
                if (!asText) { try { v = JSON.parse(v); } catch (e) { if (fail) fail(); return; } }
                done(v);
            } else if (fail) fail();
        };
        xhr.open("GET", url);
        xhr.send();
    }
    function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
    function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }

    function setRow(i, price, change) {
        var copy = rows.slice();
        copy[i] = { name: copy[i].name, color: copy[i].color, price: price, change: change === null ? "" : pct(change), up: change === null || change >= 0 };
        rows = copy;
    }

    function refresh() {
        var cur = cfg.currency || "USD";
        var picked = [];
        (cfg.board || []).forEach(function (id) {
            var a = assets[id];
            if (a && !(a.k === "fx" && a.code === cur) && picked.length < 4) picked.push(a);
        });
        if (!rows.length || rows.length !== picked.length) {
            rows = picked.map(function (a) { return { name: nameOf(a), color: a.c, price: "—", change: "", up: true }; });
        }

        get("https://api.frankfurter.dev/v1/latest?from=USD", false, function (fx) {
            var rate = cur === "USD" ? 1 : fx.rates[cur];
            if (!rate) { rate = 1; cur = "USD"; }
            get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,binancecoin,dogecoin,cardano,pax-gold,kinesis-silver&vs_currencies=usd&include_24hr_change=true", false, function (cg) {
                picked.forEach(function (a, i) {
                    if (a.k === "cg" && cg[a.cg]) setRow(i, money(cg[a.cg].usd * rate, cur), cg[a.cg].usd_24h_change);
                    if (a.k === "metal") get("https://api.gold-api.com/price/" + a.sym, false, function (m) {
                        setRow(i, money(m.price * rate, cur), cg[a.cg] ? cg[a.cg].usd_24h_change : null);
                    });
                });
            });
            picked.forEach(function (a, i) {
                if (a.k === "fred") get("https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + a.f + "&cosd=" + daysAgo(20), true, function (csv) {
                    var vals = csv.trim().split("\n").slice(1).map(function (l) { return l.split(","); })
                        .filter(function (r) { return r[1] && r[1] !== "."; }).map(function (r) { return parseFloat(r[1]); });
                    if (vals.length < 2) return;
                    var v = vals[vals.length - 1], p = vals[vals.length - 2];
                    setRow(i, a.money ? money(v * rate, cur) : fmt(v, 2), (v - p) / p * 100);
                });
                if (a.k === "fx") get("https://api.frankfurter.dev/v1/" + daysAgo(10) + "..?from=" + a.code + "&to=" + cur, false, function (j) {
                    var ds = Object.keys(j.rates).sort();
                    if (ds.length < 2) return;
                    var v = j.rates[ds[ds.length - 1]][cur], p = j.rates[ds[ds.length - 2]][cur];
                    setRow(i, money(v, cur), (v - p) / p * 100);
                });
            });
        });
    }

    // ---- moving -----------------------------------------------------------------------------------------
    function place() {
        block.x = 120 + Math.random() * (win.width - block.width - 240);
        block.y = 80 + Math.random() * Math.max(0, win.height - block.height - 160);
        block.opacity = 1;
    }
    Timer { id: reappear; interval: 1400; repeat: false; onTriggered: win.place() }
    Timer { interval: 60000; running: true; repeat: true; onTriggered: { block.opacity = 0; reappear.start(); } }
    Timer { interval: 1000; running: true; repeat: true; onTriggered: win.tick() }
    Timer { interval: 120000; running: true; repeat: true; onTriggered: win.refresh() }

    Component.onCompleted: {
        tick();
        // No settings file (the app never opened, or no Homebrew Channel): show the defaults.
        get(settingsFile, false, function (s) {
            if (s && s.board) cfg = s;
            tick(); refresh(); reappear.start();
        }, function () { refresh(); reappear.start(); });
    }
}
