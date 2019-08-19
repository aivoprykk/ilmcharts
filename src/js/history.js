
(function (my) {
    'use strict';
    var w = window, $ = w.$, _ = w._,
        Highcharts = w.Highcharts,
        SunCalc = w.SunCalc,
        drawupdates = 0,
        updateinterval = 60000,
        options = {};

    Highcharts.setOptions({
        global : {
            useUTC : false
        },
        lang: {
            months: my.months,
            weekdays: my.weekdays,
            shortWeekdays: my.shortweekdays
        },
    });

    options.wind_speed = $.extend(true, {}, my.chartoptions, {
        title: {
            text: 'Tuule kiirus'
        },
        yAxis: [{ // left y axis
            title: {
                text: null
            },
            tickInterval: 5,
            minorGridLineWidth: 1,
            gridLineWidth: 1,
            alternateGridColor: null,
            min:0,
            labels: {
                formatter: function () {
                    return this.value + 'm/s';
                },
                style: {
                    color: '#4572a7'
                }
            },
            plotBands: [{ // Light air
                from: 0.3,
                to: 1.5,
                color: 'rgba(68, 170, 213, 0.1)',
                label: {text: '0bft', style: {color: '#606060'}}
            }, { // Light breeze
                from: 1.5,
                to: 3.3,
                color: 'rgba(0, 0, 0, 0)',
                label: {text: '1', style: {color: '#606060'}}
            }, { // Gentle breeze
                from: 3.3,
                to: 5.5,
                color: 'rgba(68, 170, 213, 0.1)',
                label: {text: '2', style: {color: '#606060'}}
            }, { // Moderate breeze
                from: 5.5,
                to: 8,
                color: 'rgba(0, 0, 0, 0)',
                label: {text: '3', style: {color: '#606060'}}
            }, { // Fresh breeze
                from: 8,
                to: 11,
                color: 'rgba(68, 170, 213, 0.1)',
                label: {text: '4', style: {color: '#606060'}}
            }, { // Strong breeze
                from: 11,
                to: 14,
                color: 'rgba(0, 0, 0, 0)',
                label: {text: '5', style: {color: '#606060'}}
            }, { // High wind
                from: 14,
                to: 17,
                color: 'rgba(68, 170, 213, 0.1)',
                label: {text: '6', style: {color: '#606060'}}
            }, { // Fresh gale
                from: 17,
                to: 21,
                color: 'rgba(0, 0, 0, 0)',
                label: {text: '7', style: {color: '#606060'}}
            }]
        }, {
            linkedTo: 0,
            gridLineWidth: 0,
            labels: {
                formatter: function () {
                    return my.conv_ms2knots(this.value) + 'knots';
                },
                style: {
                    color: '#4572a7'
                }
            },
            title: {
                text: null
            },
            opposite: true
        }],
        tooltip: {
            shared: true,
            valueSuffix: ' m/s',
            xDateFormat: '%d.%m.%Y, %H:%M'
        }
    });

    options.wind_dir = $.extend(true, {}, my.chartoptions, {
        title: {
            text: 'Tuule suund'
        },
        yAxis: [{
            title: {
                text: null
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
            gridLineWidth: 0,
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

    options.temp = $.extend(true, {}, my.chartoptions, {
        title: {
            text: 'Temperatuur, õhurõhk ja -niiskus'
        },
        yAxis: [{ //0.temp
            tickInterval: 5,
            labels: {
                formatter: function () {
                    return this.value + '°C';
                }
            },
            style: {
                color: '#7cb5ec'
            },
            title: {
                text: null
            }
        },{//1.press
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
        },{//2.humid
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
        },{ //3.rain
            gridLineWidth: 0,
            tickInterval: 2,
            labels: {
                formatter: function () {
                    return this.value + 'mm';
                },
                style: {
                    color: '#4572A7'
                }
            },
            title: {
                text: null
            }
        },{ //4.waterlevel
            gridLineWidth: 0,
            tickInterval: 10,
            labels: {
                formatter: function () {
                    return this.value + 'cm';
                },
                style: {
                    color: '#8085e9'
                }
            },
            title: {
                text: null
            },
            opposite: true
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

    var ajaxopt = {
        delta:'2y', // data from past...
        hours: 6,
        res: '10m',
        wind_speed: 1,
        dewpoint: 1,
        outdoor_temperature: 1,
        windchill: 1,
        wind_direction: 1,
        absolute_pressure: 1,
        rain_1hour: 1,
        outdoor_humidity: 1
    };

    var get = {
        now:0,
        dataseries:{},
        datalen:[0,0],
        getmax: function(hours){
            hours = hours||my.histmax||24;
            return (get.now||new Date().getTime())+hours*3600000;
        },
        update_len: function(date, i){
            if(i===1) {
                if(date<get.datalen[0] || !get.datalen[0]) get.datalen[0] = date;
            }
            else if(i===2) {
                if(date>get.datalen[1] || !get.datalen[1])get.datalen[1] = date;
            }
        },
        donetable: function(json) {
            var self=my, d, s = {};
            //var table = $('<div>&nbsp;</div><table class="table" style="background-color:white;font-size:80%"><thead></thead><tbody class="tbody"></tbody></table>');
            var hlinks = '<tr><th colspan="5"><span class="hist-length" name="4"> 4h </span>&nbsp;<span class="hist-length" name="6"> 6h </span>&nbsp;<span class="hist-length" name="12"> 12h </span>&nbsp;<span class="hist-length" name="24"> 24h </span>&nbsp;<span class="hist-length" name="48"> 2p </span>&nbsp;<span class="hist-length" name="72"> 3p </span></th></tr>';
            var html = '<tbody>';
            my.lastdate = my.normalizeData(my.curplace, json, function(obj,count,i){
                //if(count-i>20) return false;
                var loc = my.curplaces[my.curplace].location,
                    sun = SunCalc.getPosition(new Date(obj.time), loc[0], loc[1]);
                var time = self.getTimeStr(obj.time).split(/\s/);
                html += _.template(my.histRowTemplate,{
                    d:obj,
                    day:self.getDayLetter(obj.time),
                    date:time[0],
                    time:time[1],
                    dn:self.dirs(obj.avg_wd),
                    wscolor: self.bfscale(obj.avg_ws).label.style.color,
                    wgcolor: self.bfscale(obj.max_ws).label.style.color,
                    night: (sun.altitude<0),
                });
            }, 0, my.start);
            html += '</tbody>';
            var $html = $(html);
            //var rev = _.filter($html.children('.item').get().reverse(),function(a,i){return i<15;});
            var rev = $html.children('.item').get().reverse();
            $html.html(rev);
            d = new Date(my.lastdate);
            var where = $('#'+my.chartorder[0]+'1');
            where.html(_.template(self.dataTableTemplate,{classes:'table',thead:_.template(self.histHeadTemplate,{inforows:hlinks}),tbody:$html.html()}));
            where.css('height','100%');
            var where2 = where.find('.table')[0];
            $('#'+my.chartorder[1]+'1').hide();
            $('#'+my.chartorder[2]+'1').hide();
            var metadata = get.histlink(my.curplace,my.lastdate,(my.lastdate + updateinterval));
            get.dohmeta(my.curplace, metadata);
            $('#pagelogo').html(my.logo + ' <span style="font-size:70%">' + my.getTimeStr(my.getTime())+'</span>');
            where = $('.hist-length');
            _.each(where,function(a){
                var d=$(a), c = d.attr('name'), b = parseInt(c,10)*3600*1000;
                d.off('click');
                d.on('click',function(e){
                    var c = d.attr('name'), b = parseInt(c,10)*3600*1000;
                    if(b===self.timeframe) return false;
                    self.setFrame(c+'h');
                });
                if(b===my.timeframe) d.css('font-weight','600');
                else d.css('font-weight','400');
            });
        },
   		done: function (json) {
            var d_series = {
                data: [],
                type: 'spline',
                lineWidth: 2
            };
            /*colors:
			#7cb5ec - sini,
			#434348 - must,
			#90ed7d -rohe,
			#f7a35c - oranz, //rõhk
			#8085e9 - lilla,
			#f15c80 - tumeoranz, //rõhk2
			#e4d354 - kuldne,
			#8085e8 - lilla2,
			#8d4653 - pruun,
			#91e8e1 - sinine2(hele)
			*/
            var d, s = {};			
            //windspeed
            s.avg_ws_series = $.extend(true, {}, d_series, {name: 'Keskmine',color:'#7cb5ec', lineWidth: 2});//1
            s.max_ws_series = $.extend(true, {}, d_series, {name: 'Max', color: '#910000', lineWidth: 2, dashStyle: 'shortdot'});//2
            s.min_ws_series = $.extend(true, {}, d_series, {name: 'Min',color:'#90ed7d', lineWidth: 2});//3
            //winddir
            s.min_wd_series = $.extend(true, {}, d_series, {type: 'scatter', name: 'Min', color:'#90ed7d', lineWidth: 0});//3
            s.avg_wd_series = $.extend(true, {}, d_series, {name: 'Keskmine', color:'#7cb5ec', lineWidth: 2});//1
            s.max_wd_series = $.extend(true, {}, d_series,  {type: 'scatter', name: 'Max', color:'#434348', lineWidth: 0});//2
            //temp
            s.avg_temp_series = $.extend(true, {}, d_series, {name: 'Temperatuur', color: '#7cb5ec', negativeColor: 'red', lineWidth: 2});//1
            s.avg_dp_series = $.extend(true, {}, d_series, {name: 'Kastepunkt', color: '#0d233a', lineWidth: 1});
            s.avg_wc_series = $.extend(true, {}, d_series, {name: 'Tuuletemp', color: '#8bbc21', lineWidth: 1});
            s.avg_press_series = $.extend(true, {}, d_series, {name: 'Õhurõhk', color: '#AA4643', lineWidth: 2, type: 'spline', dashStyle: 'shortdot', yAxis: 1, tooltip: { valueSuffix: ' hPa' }});
            s.avg_humid_series = $.extend(true, {}, d_series, {name: 'Õhuniiskus', color: '#C7C8CA', lineWidth: 1, type: 'spline', dashStyle: 'longdash', yAxis: 2, tooltip: { valueSuffix: ' %' }});
            s.avg_rain_series = $.extend(true, {}, d_series, {name: 'Sademed', color: '#4572A7', lineWidth: 0, type: 'column', yAxis: 3, tooltip: { valueSuffix: ' mm' }});
            s.avg_wtemp_series = $.extend(true, {}, d_series, {name: 'Veetemp', color: '#8d4653', lineWidth: 2});
            s.avg_wl_series = $.extend(true, {}, d_series, {name: 'Veetase', color: '#8085e9', negativeColor: '#e4d354', lineWidth: 2, type: 'spline', yAxis: 4, tooltip: { valueSuffix: ' cm' }});


            my.lastdate = my.normalizeData(my.curplace, json, function(o){
                var x = Object.keys(s)[0];
                if(!x || !s[x].data || !s[x].data.length) get.datalen[0]=o.time; 
                else get.datalen[1]=o.time; 
                my.rowToSeries(o, s);
            }, 0, my.start);
			
            options.wind_speed.series = null;
            options.wind_speed.series = [];
            options.wind_speed.series.push(s.min_ws_series);
            options.wind_speed.series.push(s.max_ws_series);
            options.wind_speed.series.push(s.avg_ws_series);
            /*if(s.avg_ws_series.data.reduce(function(a,b){var c=a.concat(b);return c;}).reduce(function(a,b){return a<b?a:b;})<1) {
				options.wind_speed.yAxis[0].min=0;
			}
			else delete options.wind_speed.yAxis[0].min;*/
			
            d = new Date(my.lastdate);
            /*$("#ajaraam").html(
				'<div class="row-fix" style="float:right;"><a href="#" onclick="return ilm.showLinks();">Lingid</a>'
				//+ " [ Temperatuur: <b>" + s.avg_temp_series.data[s.avg_temp_series.data.length - 1][1] + "</b> °C ]"
				//+ " [ Tuul: <b>" + s.avg_ws_series.data[s.avg_ws_series.data.length - 1][1] + "</b> m/s"
				//+ " (pagid: <b>" + s.max_ws_series.data[s.max_ws_series.data.length - 1][1] + "</b>) ]"
				//+ " [ Suund: <b>" + s.avg_wd_series.data[s.avg_wd_series.data.length - 1][1] + "</b> ° "
				//+ "(<b>" + my.dirs(s.avg_wd_series.data[s.avg_wd_series.data.length - 1][1]) + "</b>) ]"
				//+ " [ Rõhk: <b>" + s.avg_press_series.data[s.avg_press_series.data.length - 1][1] + "</b> hPa ]"
				+ '</div><div class="row-fix"><b>Tartu ilm</b> ' + my.getTimeStr(d,1) + "</div>"

			);*/
            $('#curplace').html('Andmed <b>'+my.curplaces[my.curplace].name+'</b>').show();
            $('#curtime').html(my.getTimeStr(d,1,my.historyactive?1:0)).show();
            var list = _.map(my.curplaces,function(a){if(!my.showgroup||my.curplaces[a.id].group===my.showgroup) {
                return '<li><a href="#" name="'+a.id+'" class="curplace-select'+(a.id===my.curplace?' active':'')+'">'+a.name+'</a></li>';
            }}).join('');
            $('#curmenu').html(list);
            $('#cursel').show();
            $('.curplace-select').on('click',function(){
                w.ilm.setCurPlace($(this).attr('name'));
                //w.ilm.reload();
                //return false;
            });
            var v = my.getWidth(null,$('.chartbox')[0]);
            //console.log('width '+v);
            if(v>450) {
                if (s.avg_ws_series.data.length) {
                    options.wind_speed.title.text = 
				' Tuule kiirus'+(!my.historyactive? ' [ <b>' + s.avg_ws_series.data[s.avg_ws_series.data.length - 1][1] + '</b> m/s' +
					' (pagid: <b>' + (s.max_ws_series.data[s.max_ws_series.data.length - 1]||['','-'])[1] + '</b> m/s) ]':'');
                } else {
                    options.wind_speed.title.text = 'Tuule kiiruse andmed puuduvad';
                }
                if (s.avg_wd_series.data.length) {
                    options.wind_dir.title.text = 
				' Tuule suund'+(!my.historyactive? ' [ <b>' + s.avg_wd_series.data[s.avg_wd_series.data.length - 1][1] + '</b> ° ' +
					'(<b>' + my.dirs(s.avg_wd_series.data[s.avg_wd_series.data.length - 1][1]) + '</b>) ]':'');
                } else {
                    options.wind_dir.title.text = 'Tuule suuna andmed puuduvad';
                }
                if (s.avg_temp_series.data.length||s.avg_wl_series.data.length) {
                    options.temp.title.text =
				(s.avg_temp_series.data.length ? ' Temperatuur'+(!my.historyactive? ' [ <b>' + s.avg_temp_series.data[s.avg_temp_series.data.length - 1][1] + '</b> °C ]':'')+',':'') +
					(s.avg_press_series.data.length ? ' Rõhk'+(!my.historyactive? ' [ <b>' + s.avg_press_series.data[s.avg_press_series.data.length - 1][1] + '</b> hPa ]':'')+',':'') +
					(s.avg_humid_series.data.length ? ' Niiskus'+(!my.historyactive? ' [ <b>' + s.avg_humid_series.data[s.avg_humid_series.data.length - 1][1] + '</b> % ]':''):'') +
					(!s.avg_humid_series.data.length && s.avg_wtemp_series.data ? ' Veetemperatuur'+(!my.historyactive? ' [ <b>' + s.avg_wtemp_series.data[s.avg_wtemp_series.data.length - 1][1] + '</b> °C ]':''):'') +
					(!s.avg_humid_series.data.length && s.avg_wl_series.data ? ' Veetase'+(!my.historyactive? ' [ <b>' + s.avg_wl_series.data[s.avg_wl_series.data.length - 1][1] + '</b> cm ]':''):'');
                } else {
                    options.temp.title.text = 'Temperatuuri andmed puuduvad';
                }
            } else {
                options.wind_speed.title.text = 'Tuule kiirus';
                options.wind_dir.title.text = 'Tuule suund';
                options.temp.title.text = 'Temperatuur, õhurõhk ja -niiskus';
            }

            options.wind_dir.series = null;
            options.wind_dir.series = [];
			
            options.wind_dir.series.push(s.min_wd_series);
            options.wind_dir.series.push(s.max_wd_series);
            options.wind_dir.series.push(s.avg_wd_series);

            options.temp.series = null;
            options.temp.series = [];
            options.temp.series.push(s.avg_temp_series);
            options.temp.series.push(s.avg_wc_series);
            options.temp.series.push(s.avg_rain_series);
            options.temp.series.push(s.avg_dp_series);
            options.temp.series.push(s.avg_humid_series);
            options.temp.series.push(s.avg_press_series);
            options.temp.series.push(s.avg_wl_series);
            options.temp.series.push(s.avg_wtemp_series);
			
            //console.log(JSON.stringify(options));
			
			
            options.wind_speed.chart.renderTo = 'wind_speed1';
            options.wind_dir.chart.renderTo = 'wind_dir1';
            options.temp.chart.renderTo = 'temp1';
			
            if(my.chartorder.indexOf('wind_speed') >= 0) my.charts[0] = new Highcharts.Chart(options.wind_speed);
            if(my.chartorder.indexOf('wind_dir') >= 0)  my.charts[1] = new Highcharts.Chart(options.wind_dir);
            if(my.chartorder.indexOf('temp') >= 0)  my.charts[2] = new Highcharts.Chart(options.temp);

            var dt = my.curplaces[my.curplace], loc=dt.location;
            var nightPlots = my.nightPlots(get.datalen,loc);
            var i, j, k, l;
            for(i=0,j=3;i<j;++i) {
                for(k=0,l=nightPlots.length;k<l;++k) {
                    if(my.charts[i]) my.charts[i].xAxis[0].addPlotBand(nightPlots[k]);
                }
            }

            /*$('#curmeta').html(
				'<a href="http://' + host + my.curplaces[my.curplace].link  +
					'" onclick="window.open(this.href);return false;">'+host.charAt(0).toUpperCase() + host.slice(1)+'</a>, andmed viimati uuendatud: ' + 
					//new Date(my.lastdate).toLocaleString() +
					my.getTimeStr(my.lastdate) +
					', Järgmine uuendus: ' +
					my.getTimeStr(my.lastdate + updateinterval)
			);*/
            var metadata = get.histlink(my.curplace,my.lastdate,(my.lastdate + updateinterval));
            get.dohmeta(my.curplace, metadata);
            $('#pagelogo').html(my.logo + ' <span style="font-size:70%">' + my.getTimeStr(my.getTime())+'</span>');
            var where = $('.hist-length');
            _.each(where,function(a){
                var d=$(a), c = d.attr('name'), b = parseInt(c,10)*3600*1000;
                d.off('click');
                d.on('click',function(e){
                    var c = d.attr('name'), b = parseInt(c,10)*3600*1000;
                    if(b===self.timeframe) return false;
                    my.setFrame(c+'h');
                });
                var islabel = d.hasClass('label');
                if(islabel) {
                    d.removeClass('label-primary');
                }
                if(b===my.timeframe) {
                    if(islabel) {
                        d.addClass('label-primary');
                    }
                    d.css('font-weight','600');
                }
                else {
                    d.css('font-weight','400');
                }
            });
    	},
    	histlink: function(fc,last,next) {
    		var cid= my.curplaces[fc],link=cid.link,fcid=cid.cid;
            var base = /emhi/.test(fc) ? 'emhi' : 
                /emu/.test(fc) ? 'emu' :
                    /flydog/.test(fc) ? 'flydog' :
                        /^ut/.test(fc) ? 'ut' :
                            /arhiiv/.test(fc) ? 'arhiiv' :
                                /mnt/.test(fc) ? 'mnt': '';
            var url = base ? my.histsourcesdata[base] : '';
            var title=url.charAt(0).toUpperCase() + url.slice(1);
            var t = '<a onclick="window.open(this.href);return false;" href="<%=url%>"><%=title%><%if(last){%> <%=last%><%}if(next){%>, järgmine <%=next%><%}%></a>';
            //var meta = '';
            var xurl = 'http://' + url + link + (base==='emhi' ? fcid+'/': '');
            return _.template(t, {title:title,url:xurl,last:last?my.getTimeStr(last):null,next:next?my.getTimeStr(next):null});
        },
        dohmeta: function(box,data){
            var cnt = $('#curmeta'), cntn=null;
            if(cnt && cnt.length) cnt.html(data);
            else {
                cnt = $('.meta');
                cntn = (cnt.length===1) ? $(cnt[0]) : (cnt.length===2) ? $(cnt[0]) : null;
                if (cntn) cntn.append('<div class="'+box+'-history-meta-info">'+data+'</div>');
            }
        },
    };
    my.loadCur = function (url) {
        if(!$('#'+my.chartorder[0]+'1').length) return;
        var d, now,ajaxopt={};
        now = d = (my.date > 0) ? new Date(my.date).getTime() : my.getTime();
        if(!my.historyactive) my.start = now;
        var json_full='';
        var cb = function(d) {
            my.dataurl=my.setHistDataUrl(my.curplace,d)+'?'+d;
            $.ajax({url: my.dataurl, data: ajaxopt}).always(function (json,type) {
                if(!/error|timeout/.test(type)){
                    json_full += json;
                }
                var x = new Date(now).getDate() !== new Date(d).getDate();
                if(/(emhi|emu|mnt|zoig|arhiiv|flydog|ut_)/.test(my.curplace) && x) {
                    d += (24 * 3600 * 1000);
                    cb(d);
                } else {
                    var cnt = $('.meta');
                    if(cnt[0]) cnt[0].innerHTML='';
                    if(my.samplemode==='table') get.donetable(json_full);
                    else get.done(json_full);
                }
            });
        };
        cb(d-my.timeframe);
    };
    
    /*function afterSetExtremes(e) {
        //var url;
        var currentExtremes, range, self=this;
        if (e) {
            currentExtremes = self.getExtremes();
            range = e.max - e.min;
            //console.log("loading again " + range + " " + e.max + " " + e.min);
        }
        my.loadCur(my.dataurl + '&hours=7&res=10m&wind_speed=1&dewpoint=1&outdoor_temperature=1&windchill=1&wind_direction=1&absolute_pressure=1');
    }*/

    var intval = 0;
    my.loadInt = function (interval) {
    	if (interval && interval > 10000) updateinterval = interval;
    	else interval = updateinterval;
    	my.loadCur();
    	if(my.date === 0) {
            clearInterval(intval);
            intval = setInterval(my.loadCur, interval);
    	}
    };
    
    my.reload = function () {
    	my.loadInt();
    };
   
    return my;

})(ilm || {});
