
(function (my) {
	var w = window, $ = w.$,
		Highcharts = w.Highcharts,
		drawupdates = 0,
		updateinterval = 60000,
		options = {};

	var normalizeData = function (data, obj) {
        var dataArray = {};
        var d;
        if(data && data.data){
			$.each(data.data, function (a, b) {
				d = parseInt(b.time_stamp, 10) * 1000;
				//obj.min_ws_series.data.push([d, my.ntof2p(b.min_wind_speed)]);
				obj.avg_ws_series.data.push([d, my.ntof2p(b.avg_wind_speed)]);
				obj.max_ws_series.data.push([d, my.ntof2p(b.max_wind_speed)]);
				//obj.min_wd_series.data.push([d, my.ntof2p(b.min_wind_direction)]);
				obj.avg_wd_series.data.push([d, my.ntof2p(b.avg_wind_direction)]);
				obj.max_wd_series.data.push([d, my.ntof2p(b.max_wind_direction)]);
				obj.avg_temp_series.data.push([d, my.ntof2p(b.avg_outdoor_temperature)]);
				obj.avg_dp_series.data.push([d, my.ntof2p(b.avg_dewpoint)]);
				obj.avg_wc_series.data.push([d, my.ntof2p(b.avg_windchill)]);
				obj.avg_rain_series.data.push([d, my.ntof2p(b.rain_1hour)]);
				obj.avg_humid_series.data.push([d, my.ntof2p(b.outdoor_humidity)]);
				obj.avg_press_series.data.push([d, my.ntof2p(b.avg_absolute_pressure)]);
			});
			if(data.data.length) {
				my.lastdate = parseInt(data.data[data.data.length - 1].time_stamp, 10) * 1000;
			}
			//console.log("count rows processed:" + data.data.length);
		} else if (data) {
			//my.datamode = "emu";
			//emu data
			var c,e,f;
			$.each(data.split("\n"),function(a, b) {
				if (b && !b.match(/^--/)) {
					c = b.split(/\s+?/);
					c[9] = (!c[9] || c[9] < 0) ? 0 : c[9];
					if(c[1].match(/5$/)){
						e=c;
						//console.log("viiega:"+c[1]); //
					} else {
						my.lastdate = d = new Date(c[0].replace(/(\d\d\d\d)(\d\d)(\d\d)/,"$1/$2/$3")+" "+c[1]).getTime();
						if(my.timeframe && (my.start-my.lastdate) <= my.timeframe) {
							if(my.curplace==='emu'){
								obj.avg_ws_series.data.push([d, my.conv_kmh2ms(my.ntof2p((e) ? my.getavg([c[7], e[7]]) : c[7]))]);
								obj.max_ws_series.data.push([d, my.conv_kmh2ms(my.ntof2p((e) ? my.getmax([c[8], e[8]]) : c[8]))]);
								obj.avg_wd_series.data.push([d, my.ntof2p((e) ? my.wdavg([c[9], e[9]]) : c[9])]);
								obj.avg_temp_series.data.push([d,my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2])]);
								obj.avg_dp_series.data.push([d, my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6])]);
								obj.avg_wc_series.data.push([d, my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3])]);
								obj.avg_rain_series.data.push([d, my.ntof2p((e) ? my.getavg([c[10], e[10]]) : c[10])]);
								obj.avg_humid_series.data.push([d, my.ntof2p((e) ? my.getavg([c[5], e[5]]) : c[5])]);
								obj.avg_press_series.data.push([d, my.ntof2p((e) ? my.getavg([c[11], e[11]]) : c[11])]);
							}
							else if(/emhi/.test(my.curplace)){
								c[4] = (!c[4] || c[4] < -49) ? null : c[4];
								obj.avg_ws_series.data.push([d, my.ntof2p((e) ? my.getavg([c[7], e[7]]) : c[7])]);
								obj.max_ws_series.data.push([d, my.ntof2p((e) ? my.getmax([c[8], e[8]]) : c[8])]);
								obj.avg_wd_series.data.push([d, my.ntof2p((e) ? my.wdavg([c[9], e[9]]) : c[9])]);
								if(c[4]!==null) obj.avg_temp_series.data.push([d,my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4])]);
								obj.avg_wc_series.data.push([d,my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3])]);
								obj.avg_wl_series.data.push([d,my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2])]);
							}
							else if(/mnt/.test(my.curplace)){
								//c[4] = (!c[4] || c[4] < -49) ? null : c[4];
								obj.avg_ws_series.data.push([d, my.ntof2p((e) ? my.getavg([c[8], e[8]]) : c[8])]);
								obj.max_ws_series.data.push([d, my.ntof2p((e) ? my.getmax([c[6], e[6]]) : c[6])]);
								obj.avg_wd_series.data.push([d, my.ntof2p((e) ? my.wdavg([c[7], e[7]]) : c[7])]);
								if(c[2]!=="") obj.avg_temp_series.data.push([d,my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2])]);
								if(c[3]!=="") obj.avg_rain_series.data.push([d, my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3])]);
								if(c[4]!=="") obj.avg_humid_series.data.push([d, my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4])]);
								if(c[5]!=="") obj.avg_dp_series.data.push([d, my.ntof2p((e) ? my.getavg([c[5], e[5]]) : c[5])]);
							}
						}
					}
				}
			});
		}
	};

	Highcharts.setOptions({
		global : {
			useUTC : false
		},
		lang: {
			months: my.months,
			weekdays: my.weekdays
		}
	});

	options.wind_speed = $.extend(true, {}, my.chartoptions, {
		title: {
			text: 'Tuule kiirus'
		},
		yAxis: [{ // left y axis
			title: {
				text: null
			},
			min: 0,
			minorGridLineWidth: 1,
			gridLineWidth: 1,
			alternateGridColor: null,
			labels: {
				formatter: function () {
					return this.value + 'm/s';
				},
				style: {
					color: "#4572a7"
				}
			},
			plotBands: [{ // Light air
				from: 0.3,
				to: 1.5,
				color: 'rgba(68, 170, 213, 0.1)',
				label: {text: '(0) tuulevaikus', style: {color: '#606060'}}
			}, { // Light breeze
				from: 1.5,
				to: 3.3,
				color: 'rgba(0, 0, 0, 0)',
				label: {text: '(1) vaikne tuul', style: {color: '#606060'}}
			}, { // Gentle breeze
				from: 3.3,
				to: 5.5,
				color: 'rgba(68, 170, 213, 0.1)',
				label: {text: '(2) kerge tuul', style: {color: '#606060'}}
			}, { // Moderate breeze
				from: 5.5,
				to: 8,
				color: 'rgba(0, 0, 0, 0)',
				label: {text: '(3) nõrk tuul', style: {color: '#606060'}}
			}, { // Fresh breeze
				from: 8,
				to: 11,
				color: 'rgba(68, 170, 213, 0.1)',
				label: {text: '(4) mõõdukas tuul', style: {color: '#606060'}}
			}, { // Strong breeze
				from: 11,
				to: 14,
				color: 'rgba(0, 0, 0, 0)',
				label: {text: '(5) üsna tugev tuul', style: {color: '#606060'}}
			}, { // High wind
				from: 14,
				to: 17,
				color: 'rgba(68, 170, 213, 0.1)',
				label: {text: '(6) tugev tuul', style: {color: '#606060'}}
			}, { // Fresh gale
				from: 17,
				to: 21,
				color: 'rgba(0, 0, 0, 0)',
				label: {text: '(7) vali tuul', style: {color: '#606060'}}
			}]
		}, {
			linkedTo: 0,
			gridLineWidth: 0,
			labels: {
				formatter: function () {
					return my.conv_ms2knots(this.value) + 'knots';
				},
				style: {
					color: "#4572a7"
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
		yAxis: [{ //1.temp
			labels: {
				formatter: function () {
					return this.value + '°C';
				}
			},
			style: {
				color: "#2f7ed8"
			},
			title: {
				text: null
			}
		}, {//2.press
			gridLineWidth: 0,
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
		}, {//3.humid
			gridLineWidth: 0,
			max: 100,
			labels: {
				formatter: function () {
					return this.value + '%';
				},
				style: {
					color: 'rgb(159,176,189)'
				}
			},
			title: {
				text: null
			},
			opposite: true
		}, { // 4. rain
			gridLineWidth: 0,
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
		}, { // 5. waterlevel
			gridLineWidth: 0,
			labels: {
				formatter: function () {
					return this.value + 'cm';
				},
				style: {
					color: '#4572A7'
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

	var ajaxopt = {
		delta:"2y", // data from past...
		hours: 6,
		res: "10m",
		wind_speed: 1,
		dewpoint: 1,
		outdoor_temperature: 1,
		windchill: 1,
		wind_direction: 1,
		absolute_pressure: 1,
		rain_1hour: 1,
		outdoor_humidity: 1
	};
    var afterGetUrl = function (json) {
			var d_series = {
				data: [],
				type: 'spline',
				lineWidth: 2
			};
			var d, s = {};			
			s.min_ws_series = $.extend(true, {}, d_series, {name: "Min"});
			s.avg_ws_series = $.extend(true, {}, d_series, {name: "Keskmine"});
			s.max_ws_series = $.extend(true, {}, d_series, {name: "Max", color: "#910000", dashStyle: 'shortdot'});
			s.min_wd_series = $.extend(true, {}, d_series, {type: "scatter", name: "Min", lineWidth: 0});
			s.avg_wd_series = $.extend(true, {name: "Keskmine"}, d_series);
			s.max_wd_series = $.extend(true, {}, d_series,  {type: "scatter", name: "Max", lineWidth: 0});
			s.avg_temp_series = $.extend(true, {color: "#2f7ed8", name: "Temperatuur", negativeColor: 'red'}, d_series);
			s.avg_press_series = $.extend(true, {}, d_series, {color: '#AA4643', type: 'spline', lineWidth: 2, dashStyle: 'shortdot', yAxis: 1, name: "Õhurõhk", tooltip: { valueSuffix: ' hPa' }});
			s.avg_humid_series = $.extend(true, {}, d_series, {color: 'rgb(159,176,189)', type: 'spline', lineWidth: 2, dashStyle: 'longdash', yAxis: 2, name: "Õhuniiskus", tooltip: { valueSuffix: ' %' }});
			s.avg_rain_series = $.extend(true, {}, d_series, {color: '#4572A7', type: 'column', lineWidth: 0, yAxis: 3, name: "Sademed", tooltip: { valueSuffix: ' mm' }});
			s.avg_dp_series = $.extend(true, {}, d_series, {lineWidth: 1, name: "Kastepunkt", color: "#0d233a"});
			s.avg_wc_series = $.extend(true, {}, d_series, {lineWidth: 1, name: "Tuuletemp", color: "#8bbc21"});
			s.avg_wl_series = $.extend(true, {color: "#2f7ed8", name: "Veetase", negativeColor: 'green', tooltip: { valueSuffix: ' cm' }}, d_series);

			normalizeData(json, s);
			
			options.wind_speed.series = null;
			options.wind_speed.series = [];
			options.wind_speed.series.push(s.avg_ws_series);
			options.wind_speed.series.push(s.min_ws_series);
			options.wind_speed.series.push(s.max_ws_series);
			
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
			$("#curplace").html('Andmed <b>'+my.curplaces[my.curplace].name+'</b>').show();
			$("#curtime").html(my.getTimeStr(d,1,my.historyactive?1:0)).show();
			var list = _.map(my.curplaces,function(a){if(!my.showgroup||my.curplaces[a.id].group===my.showgroup) {return '<li><a href="#" name="'+a.id+'" class="curplace-select'+(a.id===my.curplace?' active':'')+'">'+a.name+'</a></li>';}}).join("");
			$("#curmenu").html(list);
			$("#cursel").show();
			$(".curplace-select").on("click",function(){
					w.ilm.setCurPlace($(this).attr('name'));
					w.ilm.reload();
					//return false;
			});
			
			if (s.avg_ws_series.data.length) {
			options.wind_speed.title.text = 
				" Tuule kiirus"+(!my.historyactive? " [ <b>" + s.avg_ws_series.data[s.avg_ws_series.data.length - 1][1] + "</b> m/s" +
					" (pagid: <b>" + s.max_ws_series.data[s.max_ws_series.data.length - 1][1] + "</b> m/s) ]":'');
			} else {
			options.wind_speed.title.text = "Tuule kiiruse andmed puuduvad";
			}
			if (s.avg_wd_series.data.length) {
			options.wind_dir.title.text = 
				" Tuule suund"+(!my.historyactive? " [ <b>" + s.avg_wd_series.data[s.avg_wd_series.data.length - 1][1] + "</b> ° " +
					"(<b>" + my.dirs(s.avg_wd_series.data[s.avg_wd_series.data.length - 1][1]) + "</b>) ]":'');
			} else {
			options.wind_dir.title.text = "Tuule suuna andmed puuduvad";
			}
			if (s.avg_temp_series.data.length||s.avg_wl_series.data.length) {
			options.temp.title.text =
				(s.avg_temp_series.data.length ? " Temperatuur"+(!my.historyactive? " [ <b>" + s.avg_temp_series.data[s.avg_temp_series.data.length - 1][1] + "</b> °C ]":"")+",":"") +
					(s.avg_press_series.data.length ? " Rõhk"+(!my.historyactive? " [ <b>" + s.avg_press_series.data[s.avg_press_series.data.length - 1][1] + "</b> hPa ]":"")+",":"") +
					(s.avg_humid_series.data.length ? " Niiskus"+(!my.historyactive? " [ <b>" + s.avg_humid_series.data[s.avg_humid_series.data.length - 1][1] + "</b> % ]":""):"") +
					(!s.avg_humid_series.data.length && s.avg_wc_series.data ? " Veetemperatuur"+(!my.historyactive? " [ <b>" + s.avg_wc_series.data[s.avg_wc_series.data.length - 1][1] + "</b> °C ]":""):"") +
					(!s.avg_humid_series.data.length && s.avg_wl_series.data ? " Veetase"+(!my.historyactive? " [ <b>" + s.avg_wl_series.data[s.avg_wl_series.data.length - 1][1] + "</b> cm ]":""):"");
			} else {
				options.temp.title.text = "Temperatuuri andmed puuduvad";
			}

			options.wind_dir.series = null;
			options.wind_dir.series = [];
			options.wind_dir.series.push(s.avg_wd_series);					
			options.wind_dir.series.push(s.min_wd_series);					
			options.wind_dir.series.push(s.max_wd_series);					

			options.temp.series = null;
			options.temp.series = [];
			options.temp.series.push(s.avg_rain_series);
			options.temp.series.push(s.avg_temp_series);
			options.temp.series.push(s.avg_dp_series);
			options.temp.series.push(s.avg_wc_series);
			options.temp.series.push(s.avg_humid_series);
			options.temp.series.push(s.avg_press_series);
			options.temp.series.push(s.avg_wl_series);
			
			
			options.wind_speed.chart.renderTo = 'wind_speed1';
			options.wind_dir.chart.renderTo = 'wind_dir1';
			options.temp.chart.renderTo = 'temp1';
			
			if(my.chartorder.indexOf("wind_speed") >= 0) my.charts[0] = new Highcharts.Chart(options.wind_speed);
			if(my.chartorder.indexOf("wind_dir") >= 0)  my.charts[1] = new Highcharts.Chart(options.wind_dir);
			if(my.chartorder.indexOf("temp") >= 0)  my.charts[2] = new Highcharts.Chart(options.temp);
			var host = /emhi/.test(my.curplace) ? 'ilmateenistus.ee' : 
					/emu/.test(my.curplace) ? 'energia.emu.ee' :
					/mnt/.test(my.curplace) ? 'balticroads.net': '';
			$('#curmeta').html(
				'<a href="http://' + host + my.curplaces[my.curplace].link  +
					'" onclick="window.open(this.href);return false;">'+host.charAt(0).toUpperCase() + host.slice(1)+'</a>, andmed viimati uuendatud: ' + 
					//new Date(my.lastdate).toLocaleString() +
					my.getTimeStr(my.lastdate) +
					', Järgmine uuendus: ' +
					my.getTimeStr(my.lastdate + updateinterval)
			);
    };
    
    var setTxtFileName = function (d) {
    	d = new Date(d);
		var daystr = d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1) + "-" + (d.getDate() < 10 ? "0" : "") + d.getDate();
		return "ARC-"+daystr+'.txt';
    };
    var setEmuFileName = function (d) {
		return "emu_data/"+setTxtFileName(d);
    };
    var setEmhiFileName = function (d,place) {
    	place=place.replace(/emhi_/,'');
		return "emhi_data/"+place+"/"+setTxtFileName(d);
    };
    var setMntFileName = function (d,place) {
    	place=place.replace(/mnt_/,'');
		return "mnt_data/"+place+"/"+setTxtFileName(d);
    };
    
	my.loadCur = function (url) {
		var d, now;
		now = d = (my.date > 0) ? new Date(my.date).getTime() : new Date().getTime();
		//url = url || my.dataurl + '&hours=7&res=10m&wind_speed=1&dewpoint=1&outdoor_temperature=1&windchill=1&wind_direction=1&absolute_pressure=1';
		//fake data...
		//ajaxopt.delta="2y";
		var json_full="";
		var cb = function(d) {
			//console.log("Loading data at " + (new Date(d)));
			if(my.curplace === "emu") {
				ajaxopt={};
				my.dataurl = setEmuFileName(d);
			}
			else if(/emhi/.test(my.curplace)) {
				ajaxopt={};
				my.dataurl = setEmhiFileName(d, my.curplace);
			}
			else if(/mnt/.test(my.curplace)) {
				ajaxopt={};
				my.dataurl = setMntFileName(d, my.curplace);
			}
			//console.log("Get source: " + my.dataurl);
			$.ajax({url: my.dataurl, data: ajaxopt}).always(function (json,type) {
				if(!/error|timeout/.test(type)){
					json_full += json;
				}
				var x = new Date(now).getDate() !== new Date(d).getDate();
				if(/(emhi|emu|mnt)/.test(my.curplace) && x) {
					d += (24 * 3600 * 1000);
					cb(d);
				} else {
					afterGetUrl(json_full);
				}
			});
		};
		cb(d-my.timeframe);
    };
    
    function afterSetExtremes(e) {
		var url, currentExtremes, range;
		if (e) {
			currentExtremes = this.getExtremes();
			range = e.max - e.min;
			//console.log("loading again " + range + " " + e.max + " " + e.min);
		}
		my.loadCur(my.dataurl + '&hours=7&res=10m&wind_speed=1&dewpoint=1&outdoor_temperature=1&windchill=1&wind_direction=1&absolute_pressure=1');
	}

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
