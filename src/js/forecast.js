(function (my) {
    'use strict';
    var w = window,
        $ = w.$,
        _ = w._,
        Highcharts = w.Highcharts,
        SunCalc = w.SunCalc,
        updateinterval = 600000,
        options = {};

    Highcharts.setOptions({
        global: {
            useUTC : false
        },
        lang: {
            months: my.months,
            weekdays: my.weekdays,
            shortWeekdays: my.shortweekdays
        },
    });

    var wind_speed_options = $.extend(true, {}, my.chartoptions, {
        title: {
            text: 'Tuule kiiruse prognoos'
        },
        yAxis: [{ // left y axis
            title: {
                text: 'Tuule kiirus (m/s)'
            },
            tickInterval: 5,
            gridLineWidth: 1,
            min:0
        }],
        tooltip: {
            shared: true,
            valueSuffix: ' m/s',
            xDateFormat: '%d.%m.%Y, %H:%M'
        }
    });

    var wind_dir_options = $.extend(true, {}, my.chartoptions, {
        title: {
            text: 'Tuule suuna prognoos'
        },
        yAxis: [{
            title: {
                text: 'Tuule suund (°)'
            },
            min: 0,
            max: 360,
            tickInterval: 45,
            plotBands: [
                {from: 0,   to: 90,  label: {text: 'NE', style: {color: '#606060'}}},
                {from: 90,  to: 180, label: {text: 'SE', style: {color: '#606060'}}},
                {from: 180, to: 270, label: {text: 'SW', style: {color: '#606060'}}},
                {from: 270, to: 360, label: {text: 'NW', style: {color: '#606060'}}}
            ]
        }, {
            linkedTo: 0,
            title: {
                text: null
            },
            min: 0,
            max: 360,
            tickInterval: 45,
            opposite: true
        }],
        tooltip: {
            shared: true,
            valueSuffix: '°',
            xDateFormat: '%d.%m.%Y, %H:%M'
        }
    });

    var temp_options = $.extend(true, {}, my.chartoptions, {
        title: {
            text: 'Temperatuuri, rõhu, niiskuse prognoos'
        },
        yAxis: [{//0 temp
            tickInterval: 5,
            labels: {
                formatter: function () {
                    return this.value + '°C';
                }
            },
            title: {
                text: null
            }
        }, {//1 press
            gridLineWidth: 0,
            tickInterval: 10,
            labels: {
                formatter: function () {
                    return this.value + 'hPa';
                },
                style: {
                    color: '#AA4643'
                }
            },
            title: {
                text: null
            },
            opposite: true
        }, {//2 humid
            gridLineWidth: 0,
            tickInterval: 10,
            labels: {
                formatter: function () {
                    return this.value + '%';
                },
                style: {
                    color: '#C7C8CA'
                }
            },
            title: {
                text: null
            },
            opposite: true
        }, {//3 rain
            gridLineWidth: 0,
            tickInterval: 2,
            labels: {
                formatter: function () {
                    return this.value + 'mm';
                },
                style: {
                    color: '#2f7ed8'
                }
            },
            title: {
                text: null
            }
        }],
        tooltip: {
            shared: true,
            valueSuffix: '°C',
            xDateFormat: '%d.%m.%Y, %H:%M'
        },
        legend: {
            layout: 'vertical',
            align: 'left',
            x: 80,
            verticalAlign: 'top',
            y: 40,
            floating: true,
            backgroundColor: '#FFFFFF'
        }
    });

    function addPlotLine(chart, ts) {
        if(chart.xAxis!==undefined)
            chart.xAxis[0].addPlotLine({
                value: ts,
                color: 'rgb(238, 154, 154)',
                width: 1,
                id: 'nowline'
            });
    }
    function addNight(chart, from, to) {
        if(chart && chart.xAxis!==undefined) chart.xAxis[0].addPlotBand({color:'#f9f9f9',from:from,to:to, zIndex:0});
    }

    function removePlotLine(chart) {
        if(chart.xAxis!==undefined)
            chart.xAxis[0].removePlotLine('nowline');
    }

    function intPlotLine(chart, intval) {
        var interval = 60000;
        var now = my.getTime();
        clearInterval(intval);
        removePlotLine(chart);
        addPlotLine(chart, now);
        intval = setInterval(function () {
            removePlotLine(chart);
            addPlotLine(chart, now);
        }, interval);
        return intval;
    }

    var d_series = {
        data: [],
        type: 'spline',
        lineWidth: 2
    };
    var temp_series = {
        data: [],
        type: 'spline',
        lineWidth: 2,
        labels: {
            style: {
                color: '#7cb5ec'
            }
        },
        negativeColor: 'red'
    };
    var press_series = {
        data: [],
        type: 'spline',
        lineWidth: 2,
        dashStyle: 'shortdot',
        yAxis: 1,
        tooltip: {valueSuffix: 'hPa'},
        labels: {
            style: {
                color: '#AA4643'
            }
        }
    };
    var humid_series = {
        data: [],
        type: 'spline',
        lineWidth: 2,
        dashStyle: 'longdash',
        yAxis: 2,
        tooltip: {valueSuffix: '%'},
        labels: {
            style: {
                color: '#C7C8CA'
            }
        }
    };
    var rain_series = {
        data: [],
        type: 'column',
        lineWidth: 0,
        yAxis: 3,
        tooltip: {valueSuffix: 'mm'},
        labels: {
            style: {
                color: '#4572A7'
            }
        }
    };
    var fcsources = ['yr', 'wg', 'em'];
    var ajax_done = 0;
    var last_time = 0;
    var colors = {
        'wind':['#7cb5ec','#90ed7d','#ffcc99'],
        'gust':['#aa4643','#f15c80','#800000'],
        'dir':['#7cb5ec','#90ed7d','#ffcc99'],
        'temp':['#7cb5ec','#90ed7d','#ffcc99'],
        'press':['#aa4643','#f15c80','#800000'],
        'rain':['#4572A7','#4572A7','#d1d1e0'],
        'humid':['#C7C8CA','#C7C8CA','#C7C8CA']
    };

    var get = {
        now:0,
        dataseries:{},
        datalen:[0,0],
        do: function(place, fcid, fillfn) {
            get.now = new Date().getTime();
            place = (place || my.fcplace || 'tabivere');
            //var self = get;
            if(ajax_done===0) {
                get.datalen = [0,0];
            }
            if(my.samplemode==='table' && (my.fcsource!==fcid)) {
                if(++ajax_done===fcsources.length) get.done();
                return false;
            }
            var fc = my.fcsourcesdata[fcid];
            var fcidx = my.fcsources.indexOf(fcid);
            var fcfile = fc.fc_file;
            if(my.sampletype==='long' && /hour_by_hour/.test(fcfile)) {
                fcfile = 'forecast.xml';
            }
            var ajaxopt = {
                type: 'get',
                url: fc.datadir + '/' + place  + '/' + fcfile + '?' + get.now,
            };
            if(fc.datatype==='json' && fcid!=='yr') {
                ajaxopt.dataType = 'jsonp';
                ajaxopt.jsonp =  'callback';
                ajaxopt.jsonpCallback = fcid==='wg' ? fcid+'_data' : 'callback';
            }
            $.ajax(ajaxopt).always(function (data,type) {
                if(!/error|timeout/.test(type)){
                    get.dataseries = get.dataseries || {};
                    get.dataseries[fcid] = get.dataseries[fcid] || {};
                    get.dataseries[fcid][place] = {};
                    var dt = get.dataseries[fcid][place];
                    dt.ws_series = $.extend(true, {}, d_series, {name: fc.name+' wind', color: colors.wind[fcidx], lineWidth: 2});
                    dt.wd_series = $.extend(true, {}, d_series, {name: fc.name+' dir', color: colors.dir[fcidx], lineWidth: 2});
                    dt.wg_series = $.extend(true, {}, d_series, {name: fc.name+' gust',color: colors.gust[fcidx], lineWidth: 2, dashStyle: 'shortdot'});
                    dt.temp_series = $.extend(true, {}, temp_series, {name: fc.name+' temperatuur', color: colors.temp[fcidx], lineWidth: 2});
                    dt.press_series = $.extend(true, {}, press_series, {name: fc.name+' rõhk', color: colors.press[fcidx], lineWidth: 1});
                    dt.rain_series = $.extend(true, {}, rain_series, {name: fc.name+' sademed', color: colors.rain[fcidx], type: 'column', lineWidth: 0});
                    dt.humid_series = $.extend(true, {}, humid_series, {name: fc.name+' niiskus', color: colors.humid[fcidx], lineWidth: 1});

                    if(fillfn) fillfn(data, dt, fcid);

                    if(my.samplemode==='graph') {
                        if(dt.ws_series.data.length) wind_speed_options.series.push(dt.ws_series);
                        if(dt.wg_series.data.length) wind_speed_options.series.push(dt.wg_series);
                        if(dt.wd_series.data.length) wind_dir_options.series.push(dt.wd_series);
                        if(dt.humid_series.data.length) temp_options.series.push(dt.humid_series);
                        if(dt.rain_series.data.length) temp_options.series.push(dt.rain_series);
                        if(dt.press_series.data.length) temp_options.series.push(dt.press_series);
                        if(dt.temp_series.data.length) temp_options.series.push(dt.temp_series);
                    }
                    var metadata = get.fclink(fcid,fc.url,my.fcplaces[place][fcid+'link'],fc.name,dt.last,dt.next);
                    get.dometa(fcid, metadata);
                }
                if(++ajax_done===fcsources.length) get.done();
            });
        },
        fclink: function(fc,url,placeid,placename,last,next) {
            var t = '<a onclick="window.open(this.href);return false;" href="<%=url%>"><%=title%><%if(last){%> <%=last%><%}if(next){%>, järgmine <%=next%><%}%></a>';
            var meta = '';
            if(my.fcsources.indexOf(fc)<0||!url||!placeid||!placename) {
                var link = {},ll=my.lingid.JSON.list,lm={},ln={},metadata='';
                for(var i=0,j=ll.length;i<j;++i){
                    if(ll[i].name === 'Ilmalingid') {
                        lm=ll[i].list;
                        for(var k=0,l=lm.length;k<l;++k){
                            if(lm[k].name === fc) {
                                ln = lm[k].list;
                                for(var m=0,n=ln.length;m<n;++m){
                                    var x = new RegExp('.+_('+my.fcplace+')');
                                    if(x.test(ln[m].id)) {
                                        url = lm[k].url;
                                        placeid = ln[m].href;
                                        placename = lm[k].name;
                                        break;
                                    }
                                }
                                break;

                            }
                        }
                        break;
                    }
                }
            }
            var fcurl = fc==='em' ? url + '/asukoha-prognoos/?coordinates=' + placeid :
                fc==='yr' ? url+'/en/details/table/'+placeid+'/' :
                    fc==='wg' ? url + '/' + placeid : url + placeid ;

            return _.template(t)({title:placename,url:fcurl,last:last?my.getTimeStr(last):null,next:next?my.getTimeStr(next):null});
        },
        do_em: function(data,dt,fcid){
            var fcmax=get.getmax();
            var  offset = my.getOffsetSec(), em = data.forecast.tabular,
                em_get_time = function(xd) {
                    return (function (d) {
                        return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
                    })(xd.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/));
                }, i = 0, j = em.time.length, k = j-1, initdate = 0;

            var from, to, d;
            for (; i < j; ++i) {
                from=em_get_time(em.time[i]['@attributes'].from).getTime();
                to=em_get_time(em.time[i]['@attributes'].to).getTime();
                d = from + ((to-from)/2);
                if(i===0) {
                    initdate = new Date(d);
                }
                if(i===0||i===k||(fcmax&&d>fcmax)) get.update_len(d,i===0?1:i===k||(fcmax&&d>fcmax)?2:0);
                if (fcmax&&d>fcmax) { break; }
                dt.ws_series.data.push([d, my.ntof2p(em.time[i].windSpeed['@attributes'].mps)]);
                dt.wd_series.data.push([d, my.ntof2p(em.time[i].windDirection['@attributes'].deg)]);
                dt.temp_series.data.push([d, my.ntof2p(em.time[i].temperature['@attributes'].value)]);
                dt.press_series.data.push([d, my.ntof2p(em.time[i].pressure['@attributes'].value)]);
                dt.rain_series.data.push([d, my.ntof2p(em.time[i].precipitation['@attributes'].value)]);
            }

            from=initdate.getTime();
            dt.last = from;
            dt.next = from+6*3600000;
        },
        getmax: function(hours){
            if(my.sampletype==='long') return 0;
            hours = hours||my.fcmax||my.deffcmax;
            return (get.now||new Date().getTime())+hours*3600000;
        },
        do_wg: function(data,dt,fcid){
            var fcmax=get.getmax();
            var wg = data.fcst.fcst[3],
                wg_get_time = function(xd) {
                    return (function (d) {
                        return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
                    })(xd.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/));
                },
                offset = data.fcst.utc_offset*3600000, d = (wg_get_time(wg.initdate).getTime()) + offset, //+ 1800000,
                t = 0, i = 0, j = wg.hours.length, k = j-1;

            for (; i < j; ++i) {
                t = d + (wg.hours[i] * 3600000);
                if(i===0||i===k||(fcmax&&t>fcmax)) get.update_len(t,i===0?1:i===k||(fcmax&&t>fcmax)?2:0);
                if (fcmax&&t>fcmax) { break; }
                dt.ws_series.data.push([t, my.conv_knot2ms(wg.WINDSPD[i])]);
                dt.wg_series.data.push([t, my.conv_knot2ms(wg.GUST[i])]);
                dt.wd_series.data.push([t, my.ntof2p(wg.WINDDIR[i])]);
                dt.temp_series.data.push([t, my.ntof2p(wg.TMP[i])]);
                dt.press_series.data.push([t, my.ntof2p(wg.SLP[i])]);
                dt.humid_series.data.push([t, my.ntof2p(wg.RH[i])]);
                if(my.samplemode!=='graph') dt.rain_series.data.push([t, my.ntof2p(wg.PCPT[i])]);
            }

            dt.last = new Date(wg.update_last.replace(/-/g,'/').replace(/\+.+/,'')).getTime()+offset;
            dt.next = new Date(wg.update_next.replace(/-/g,'/').replace(/\+.+/,'')).getTime()+offset;
            last_time = (wg_get_time(wg.initdate).getTime()) + offset;
        },
        update_len: function(date, i){
            if(i===1) {
                if(date<get.datalen[0] || !get.datalen[0]) get.datalen[0] = date;
            }
            else if(i===2) {
                if(date>get.datalen[1] || !get.datalen[1])get.datalen[1] = date;
            }
        },
        do_yr0: function(data,dt,fcid){
            var fcmax=get.getmax();
            var $xml = $(data), d,
                yr_get_time = function(xml,name) {
                    var attr = xml.find ? xml.find(name).text() : xml.getAttribute(name);
                    return (function (d) {
                        return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
                    })((attr ? attr : xml.getAttribute('from')).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/));
                };
            var nodes = $xml.find('tabular time'),i = 0, j=nodes.length, k = j-1, times;
            for (; i < j; ++i) {
                //nodes.each(function (i, times) {
                times = nodes[i];
                var from=yr_get_time(times,'from').getTime(), to=yr_get_time(times,'to').getTime();
                d = from + ((to-from)/2);
                if(i===0||i===k||(fcmax&&d>fcmax)) get.update_len(d,i===0?1:i===k||(fcmax&&d>fcmax)?2:0);
                if (fcmax&&d>fcmax) { break; }
                dt.ws_series.data.push([d, my.ntof2p($(times).find('windSpeed').attr('mps'))]);
                dt.wd_series.data.push([d, my.ntof2p($(times).find('windDirection').attr('deg'))]);
                dt.temp_series.data.push([d, my.ntof2p($(times).find('temperature').attr('value'))]);
                dt.press_series.data.push([d, my.ntof2p($(times).find('pressure').attr('value'))]);
                dt.rain_series.data.push([d, my.ntof2p($(times).find('precipitation').attr('value'))]);
                //});
            }

            dt.last = yr_get_time($xml,'lastupdate').getTime();
            dt.next = yr_get_time($xml,'nextupdate').getTime();
            last_time = dt.last;
        },
        do_yr: function(data,dt,fcid){
            var fcmax=get.getmax();
            var yr = data.properties.timeseries,
                yr_get_time = function(xd) {
                    return new Date(xd);
                },
                offset = 0*3600000, d = (yr_get_time((yr[0]||{}).time).getTime()) + offset, //+ 1800000,
                t = 0, i = 0, j = yr.length, k = j-1, lo, o, op;

            for (; i < j; ++i) {
                lo = yr[i];
                t = yr_get_time((lo||{}).time).getTime()+offset;
                if(i===0||i===k||(fcmax&&t>fcmax)) get.update_len(t,i===0?1:i===k||(fcmax&&t>fcmax)?2:0);
                if (fcmax&&t>fcmax) { break; }
                o = lo.data.instant.details;
                dt.ws_series.data.push([t, my.ntof2p(o.wind_speed)]);
                dt.wg_series.data.push([t, my.ntof2p(o.wind_speed_of_gust)]);
                dt.wd_series.data.push([t, my.ntof2p(o.wind_from_direction)]);
                dt.temp_series.data.push([t, my.ntof2p(o.air_temperature)]);
                dt.press_series.data.push([t, my.ntof2p(o.air_pressure_at_sea_level)]);
                dt.humid_series.data.push([t, my.ntof2p(o.relative_humidity)]);
                if(my.samplemode!=='graph') {
                    o = lo.data.next_1_hours||lo.data.next_6_hours||lo.data.next_12_hours;
                    if(o) {
                        op = o.details.precipitation_amount_max>0 ? o.details.precipitation_amount_min+'-'+o.details.precipitation_amount_max : o.details.precipitation_amount;
                        dt.rain_series.data.push([t, op]);
                    }
                }
            }

            dt.last = (yr_get_time(data.properties.meta.updated_at).getTime()) + offset;
            last_time = dt.last;
        },
        dometa: function(box,data){
            var cnt = $('#'+box+'meta'), cntn=null;
            if(cnt && cnt.length) cnt.html(data);
            else {
                cnt = $('.meta');
                cntn = (cnt.length===1) ? $(cnt[0]) : (cnt.length===2) ? $(cnt[1]) : null;
                if (cntn) cntn.append('<div class="'+box+'-focecast-meta-info">'+data+'</div>');
            }
        },
        done: function() {
            ajax_done = 0;
            var self=my, i1, i2, i3, i=0,j=0,dn=null,
                dtf = Object.keys(get.dataseries)[0],
                dtp = get.dataseries[my.fcsource||my.fcsources[0]]||get.dataseries[dtf],
                dt = dtp[my.fcplace]||{},
                fc=my.fcplaces[my.fcplace],
                loc=fc.location, sun = {},
                has = {
                    ws: (dt.ws_series && dt.ws_series.data.length),
                    wg: (dt.wg_series && dt.wg_series.data.length),
                    wd: (dt.wd_series && dt.wd_series.data.length),
                    humid: (dt.humid_series && dt.humid_series.data.length),
                    rain: (dt.rain_series && dt.rain_series.data.length),
                    press: (dt.press_series && dt.press_series.data.length),
                    temp: (dt.temp_series && dt.temp_series.data.length)
                },
                dbase = has.ws ? dt.ws_series.data : has.temp ? dt.temp_series.data : has.wd ? dt.wd_series.data : [],
                k=0, l=0, kn='', night=false, nightplot=[], doplot=false;

            if(my.samplemode==='graph') {
                $('#'+my.chartorder[0]+'2').css({height:''});
                $('#'+my.chartorder[1]+'2').show();
                $('#'+my.chartorder[2]+'2').show();
                if(my.chartorder.indexOf('wind_speed')>=0) {
                    my.charts[3] = new Highcharts.Chart(wind_speed_options);
                    i1 = intPlotLine(my.charts[3], i1);
                }
                if(my.chartorder.indexOf('wind_dir')>=0) {
                    my.charts[4] = new Highcharts.Chart(wind_dir_options);
                    i2 = intPlotLine(my.charts[4], i2);
                }
                if(my.chartorder.indexOf('temp')>=0) {
                    my.charts[5] = new Highcharts.Chart(temp_options);
                    i3 = intPlotLine(my.charts[5], i3);
                }
                var nightPlots = my.nightPlots(get.datalen,loc);
                for(i=3,j=6;i<j;++i) {
                    for(k=0,l=nightPlots.length;k<l;++k) {
                        if(my.charts[i]) my.charts[i].xAxis[0].addPlotBand(nightPlots[k]);
                    }
                }
            } else {
                //var htempl = '<tr><th>Aeg</th><th>Tuul</th><th>Suund</th><th>Temp</th><th>Sademed</th><th class="hide-edge-xs">Rõhk</th></tr>';
                //var templ = '<tr class="<%=night?"night hide":""%>"><td><span class="day hide"><%=day%>&nbsp;</span><%=time%></td><td><span class="ws"<%if(wscolor){%> style="color:<%=wscolor%>"<%}%>><%=ws?ws:""%></span><%if(wg){%>/<span class="wg"<%if(wgcolor){%> style="color:<%=wgcolor%>"<%}%>><%=wg%></span><%}%></td><td><%=wd?wd:""%></td><td><%=temp?temp:""%></td><td><%=rain?rain:""%></td><td class="hide-edge-xs"><%=press?press:""%></td></tr>';
                var str='';
                var hlinks = '<tr class="fcontainer"><th colspan="6"><span class="fc-source" name="em">Ilmateenistus</span>&nbsp;<span class="fc-source" name="wg">Windguru.cz</span>&nbsp;<span class="fc-source" name="yr">Yr.no</span><span class="right fchead">'+fc.name+'</span></th></tr>';
                var keys = Object.keys(has),tnow=new Date().getTime(),o;

                for(i=0,j=dbase.length;i<j;++i) {
                    dn=dbase[i][0]||0;
                    if(dn<tnow) continue;
                    sun = SunCalc.getPosition(new Date(dn), loc[0], loc[1]);
                    //if(dbase[i][0]>(tnow+(24*3600*1001))) break;
                    var opt = {
                        time: self.getTimeStr(dn),
                        night:(sun.altitude<0),
                        dn:self.dirs(dt.wd_series.data[i][1]),
                        wscolor:has.ws?self.colorasbf(dt.ws_series.data[i][1]).color:'',
                        wgcolor:has.wg?self.colorasbf(dt.wg_series.data[i][1]).color:'',
                        day:self.getDayLetter(dn),
                        hide:!self.fcshownight
                    };
                    for(k=0,l=keys.length;k<l;++k) {
                        kn = keys[k];
                        o=(has[kn]) ? dt[kn+'_series'].data[i] : null;
                        opt[kn] = (o) ? o[1] : null;
                    }
                    str += _.template(self.fcRowTemplate)(opt);
                }

                var where = $('#'+my.chartorder[0]+'2');
                if(where) {
                    where.html(_.template(self.dataTableTemplate)({classes:'table',thead:_.template(self.fcHeadTemplate)({inforows:hlinks}),tbody:str}));
                    where.css('height','100%');
                }
                $('#'+my.chartorder[1]+'2').hide();
                $('#'+my.chartorder[2]+'2').hide();
                where = $('.fc-source');
                _.each(where,function(a){
                    if($(a).attr('name')===my.fcsource) $(a).css('font-weight','600');
                    else $(a).css('font-weight','400');
                });
                $('.fc-source').on('click',function(){
                    w.ilm.setFcSource($(this).attr('name'));
                    //w.ilm.reloadest();
                });
            }
            $('#fctitle').html(
                'Prognoos <b>'+my.fcplaces[my.fcplace].name+'</b> ' + my.getTimeStr(last_time)
            ).show();
            var list = _.map(my.fcplaces,function(a){if(!my.showgroup||my.fcplaces[a.id].group===my.showgroup) {
                return '<li><a href="#" name="'+a.id+'" class="fcplace-select'+(a.id===my.fcplace?' active':'')+'">'+a.name+'</a></li>';
            }}).join('');
            $('#fcmenu').html(list);
            $('#fcsel').show();
            $('.fcplace-select').on('click',function(){
                w.ilm.fcsource = $(this).attr('name');
                w.ilm.reloadest();
            });
            $('#pagelogo').html(my.logo + ' <span style="font-size:70%">' + my.getTimeStr(my.getTime())+'</span>');
            var metadata = get.fclink('Meteo.pl');
            if(metadata) get.dometa('meteo-pl', metadata);
        }
    };

    my.loadEst = function (place) {
        if(!$('#'+my.chartorder[0]+'2').length) return;
        place = (place || my.fcplace || 'tabivere');

        ajax_done = 0;

        wind_speed_options.series = null;
        wind_speed_options.series = [];
        wind_speed_options.chart.renderTo = 'wind_speed2';

        wind_dir_options.series = null;
        wind_dir_options.series = [];
        wind_dir_options.chart.renderTo = 'wind_dir2';

        temp_options.series = null;
        temp_options.series = [];
        temp_options.chart.renderTo = 'temp2';

        var cnt = $('.meta');
        if(cnt.length===1) {
            cnt[0].innerHTML='';
        }
        if(cnt.length===2) {
            cnt[1].innerHTML='';
        }

        for (var a='', i = my.fcsources.length - 1; i >= 0; i--) {
            a = my.fcsources[i];
            //get[a](a, place);
            get.do(place, a, get['do_'+a]);
        }
    };

    var intval = 0;

    my.loadEstInt = function (interval) {
        if (interval && interval > 10000) updateinterval = interval;
        else interval = updateinterval;
        my.loadEst();
        clearInterval(intval);
        intval = setInterval(my.loadEst, interval);
    };

    my.reloadest = function () {
        my.loadEstInt();
    };

    return my;

})(window.ilm || {});
