<script src="http://widget.windguru.cz/js/wg_widget.php" type="text/javascript"></script>
<script language="JavaScript" type="text/javascript">
//<![CDATA[
WgWidget({
s: 266923, odh:0, doh:24, wj:'knots', tj:'c', waj:'m', fhours:72, lng:'ee',
params: ['WINDSPD','GUST','MWINDSPD','SMER','TMPE','TCDC','APCPs'],
first_row:true,
spotname:true,
first_row_minfo:true,
last_row:true,
lat_lon:true,
tz:true,
sun:true,
link_archive:false,
link_new_window:false
},
'wg_target_div_266923_46917928'
);
//]]>
</script>
<div id="wg_target_div_266923_46917928"></div>

if (!WgWidget) var WgWidget = function (k, h) {
        function l() {
            c = window.jQuery.noConflict(!1);
            m()
        }
        function n(a) {
            if (!p) {
                p = !0;
                var e = {}, d = {
                        m: 3,
                        params: ["WINDSPD","SMER","TMPE","CDC","APCPs"],
                        tabs: !1,
                        wg_logo: !0,
                        spotname: !0,
                        first_row_minfo: !0,
                        options_link: !1,
                        link_archive: !1,
                        link_tides: !1,
                        link_link: !1,
                        odh: 3,
                        doh: 22,
                        fhours: 72,
                        wrap: 200,
                        lng: "en",
                        logo: !0,
                        poweredby: !0,
                        path_img: f + "/int/img/",
                        path_link: q + "/int/",
                        fcst_maps: !1
                    }, b;
                for (b in a) d[b] = a[b];
                a = [];
                for (b = 0; b < d.params.length; b++) {
                    var j = d.params[b];
                    "WAVESMER" == j && (j = "DIRPW");
                    a[b] = j
                }
                d.params = a;
                e.url = window.location.href;
                e.hostname = window.location.hostname;
                e.s = d.s;
                e.m = d.m;
                e.lng = d.lng;
                var g = e.s + "_" + e.m + "_" + e.lng;
                b = c("#" + h);
                b.hasClass("cleanslate") || b.addClass("cleanslate");
                b.hasClass("wgfcst") || b.addClass("wgfcst");
                "undefined" === typeof WgJsonCache && (WgJsonCache = {});
                WgJsonCache[g] ? (d.lang = WgJsonCache[g].lang, WgFcst.showForecast(WgJsonCache[g].fcst, d, h)) : c.getJSON(f + "/int/widget_json.php?callback=?", e, function (a) {
                    a.error ? a.fcst = a : (d.lang = a.lang, WgJsonCache[g] = a);
                    WgFcst.showForecast(a.fcst,
                        d, h)
                })
            }
        }
        function m() {
            c(document).ready(function () {
                c("<link>", {
                    rel: "stylesheet",
                    type: "text/css",
                    href: f + "/wgstyle-widget45.min.css"
                }).appendTo("head");
                "undefined" === typeof WgFcst ? (c.ajaxSetup({
                    cache: !0
                }), c.getScript(f + "/js/jq_fcst_plugins.5.min.js", function () {
                    c.ajaxSetup({
                        cache: !0
                    });
                    c.getScript(f + "/js/wg_forecasts.44.min.js", function () {
                        c.ajaxSetup({
                            cache: !1
                        });
                        n(k)
                    })
                }), c.ajaxSetup({
                    cache: !1
                })) : n(k)
            })
        }
        var c,
        	f = "http://widget.windguru.cz",
            q = "http://www.windguru.cz",
            p = !1,
            a = 0;
        void 0 !== window.jQuery && (a = parseFloat(window.jQuery.fn.jquery.substr(0, 3)));
        1.4 > a || 1.8 < a ? (a = document.createElement("script"), a.setAttribute("type", "text/javascript"), a.setAttribute("src", "https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"), a.onload = l, -1 != navigator.userAgent.indexOf("MSIE") && (a.onreadystatechange = function () {
            ("complete" == this.readyState || "loaded" == this.readyState) && l()
        }), (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(a)) : (c = window.jQuery, m())
};
