(function (my) {
	var w = window,
	$ = w.$,
	Highcharts = w.Highcharts,
	updateinterval = 600000,
	options = {};
	
	Highcharts.setOptions({
		global: {
			useUTC : false
		},
		lang: {
			months: my.months,
			weekdays: my.weekdays
		}
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
				text: "Tuule suund (°)"
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
					color: "#C7C8CA"
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
					color: "#2f7ed8"
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
				color: "#7cb5ec"
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
	var fcsources = ["yr", "wg", "em"];
	var ajax_done = 0;
	var last_time = 0;
	var colors = {
		"wind":["#7cb5ec","#90ed7d","#ffcc99"],
		"gust":["#aa4643","#f15c80","#800000"],
		"dir":["#7cb5ec","#90ed7d","#ffcc99"],
		"temp":["#7cb5ec","#90ed7d","#ffcc99"],
		"press":["#aa4643","#f15c80","#800000"],
		"rain":["#4572A7","#4572A7","#d1d1e0"],
		"humid":["#C7C8CA","#C7C8CA","#C7C8CA"]
	};

	var get = {
		yr: function(da, place) {
			place = (place || my.fcplace || 'tabivere') + "/";
			var fc = my.fcsourcesdata[da];
			var idx = my.fcsources.indexOf(da);
			$.ajax({
				type: "get",
				url: fc.datadir + "/" + place  + "/" + fc.fc_file,
		}).done(function (xml) {
			var _ws_series = $.extend(true, {}, d_series, {name: fc.name+" wind", color: colors.wind[idx], lineWidth: 2});
			var _wd_series = $.extend(true, {}, d_series, {name: fc.name+" dir", color: colors.dir[idx], lineWidth: 2});
			var _temp_series = $.extend(true, {}, temp_series, {name: fc.name+" temperatuur", color: colors.temp[idx], lineWidth: 2});
			var _press_series = $.extend(true, {}, press_series, {name: fc.name+" rõhk", color: colors.press[idx], lineWidth: 1});
			var _rain_series = $.extend(true, {}, rain_series, {name: fc.name+" sademed", color: colors.rain[idx], type: 'column', lineWidth: 0});
			
			var $xml = $(xml);
			var d;			
			var yr_get_time = function(xml,name) {
				return (function (d) {
					return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
				})((xml.find ? xml.find(name).text() : xml.getAttribute("from")).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/));
			};

			$xml.find('tabular time').each(function (i, times) {
				d = (yr_get_time(times,"from").getTime()) + 1800000;
				_ws_series.data.push([d, my.ntof2p($(times).find("windSpeed").attr("mps"))]);
				_wd_series.data.push([d, my.ntof2p($(times).find("windDirection").attr("deg"))]);
				_temp_series.data.push([d, my.ntof2p($(times).find("temperature").attr("value"))]);
				_press_series.data.push([d, my.ntof2p($(times).find("pressure").attr("value"))]);
				_rain_series.data.push([d, my.ntof2p($(times).find("precipitation").attr("maxvalue"))]);
			});
			wind_speed_options.series.push(_ws_series);
			wind_dir_options.series.push(_wd_series);
			temp_options.series.push(_rain_series);
			temp_options.series.push(_press_series);
			temp_options.series.push(_temp_series);
			$('#yrmeta').html(
				'<a href="' +
				fc.url+'/place/Estonia/'+my.fcplaces[my.fcplace].yrlink+'/hour_by_hour.html' + 
				'" onclick="window.open(this.href);return false;">Yr.no</a> andmed viimati uuendatud: '	+ 
				my.getTimeStr(yr_get_time($xml,'lastupdate')) +
				', Järgmine uuendus: ' +
				my.getTimeStr(yr_get_time($xml,'nextupdate'))
				);
			last_time = yr_get_time($xml,'lastupdate');
			if(++ajax_done===fcsources.length) get.done();
		});
	},
	wg: function(da, place) {
		place = (place || my.fcplace || 'tabivere');			
		var fc = my.fcsourcesdata[da];
		var idx = my.fcsources.indexOf(da);
		$.ajax({
			type: "get",
			url: fc.datadir + "/" + place  + "/" + fc.fc_file,
			dataType: "jsonp",
			jsonp: "callback",
			jsonpCallback: "wg_data"
		}).done(function (json) {
			var _ws_series = $.extend(true, {}, d_series, {name: fc.name+" tuul", color: colors.wind[idx], lineWidth: 2});
			var _wd_series = $.extend(true, {}, d_series, {name: fc.name+" dir",color: colors.dir[idx], lineWidth: 2});
			var _wg_series = $.extend(true, {}, d_series, {name: fc.name+" gust",color: colors.gust[idx], lineWidth: 2, dashStyle: 'shortdot'});
			var _temp_series = $.extend(true, {}, temp_series, {name: fc.name+" temperatuur", color:colors.temp[idx], lineWidth: 2});
			var _press_series = $.extend(true, {}, press_series, {name: fc.name+" rõhk", color: colors.press[idx], lineWidth: 1});
			var _humid_series = $.extend(true, {}, humid_series, {name: fc.name+" niiskus", color: colors.humid[idx], lineWidth: 1});

				var wg = json.fcst.fcst[3];
				var wg_get_time = function(xd) {
					return (function (d) {
						return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
					})(xd.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/));
				};
				var d = (wg_get_time(wg.initdate).getTime()) + my.getOffsetSec() + 1800000,
				t = 0, i = 0, j = wg.hours.length;
				
				for (; i < j; ++i) {
					if (wg.hours[i] > 72) { break; }
					t = d + (wg.hours[i] * 3600 * 1000);
					_ws_series.data.push([t, my.conv_knot2ms(wg.WINDSPD[i])]);
					_wg_series.data.push([t, my.conv_knot2ms(wg.GUST[i])]);
					_wd_series.data.push([t, my.ntof2p(wg.WINDDIR[i])]);
					_temp_series.data.push([t, my.ntof2p(wg.TMP[i])]);
					_press_series.data.push([t, my.ntof2p(wg.SLP[i])]);
					_humid_series.data.push([t, my.ntof2p(wg.RH[i])]);
				}
				// windguru series: 6 for now
				wind_speed_options.series.push(_wg_series);
				wind_speed_options.series.push(_ws_series);
				
				wind_dir_options.series.push(_wd_series);
				
				temp_options.series.push(_humid_series);
				temp_options.series.push(_press_series);
				temp_options.series.push(_temp_series);

				$('#wgmeta').html(
					'<a href="' +
					fc.url+"/ee/?go=1&amp;sc="+my.fcplaces[my.fcplace].wglink+"&amp;wj=msd&amp;tj=c&amp;fhours=180&amp;odh=3&amp;doh=22" +
					'" onclick="window.open(this.href);return false;">Windguru.cz</a> andmed viimati uuendatud: ' + 
					my.getTimeStr(new Date(wg.update_last.replace(/\+.+/,"")).getTime()+my.getOffsetSec()) +
					', Järgmine uuendus: ' + 
					my.getTimeStr(new Date(wg.update_next.replace(/\+.+/,"")).getTime()+my.getOffsetSec())
					);
				last_time = (wg_get_time(wg.initdate).getTime()) + my.getOffsetSec();
				if(++ajax_done===fcsources.length) get.done();
			});
	},
	em: function(da, place) {
		place = (place || my.fcplace || 'tabivere');
		var fc = my.fcsourcesdata[da];
		var idx = my.fcsources.indexOf(da);
		$.ajax({
			type: "get",
			url: fc.datadir + "/" + place  + "/" + fc.fc_file,
			dataType: "jsonp",
			jsonp: "callback",
			jsonpCallback: "callback"
		}).done(function (json) {
			var _ws_series = $.extend(true, {}, d_series, {name: fc.name+" tuul",color:colors.wind[idx], lineWidth: 2});
			var _wd_series = $.extend(true, {}, d_series, {name: fc.name+" dir",color:colors.dir[idx], lineWidth: 2});
			var _temp_series = $.extend(true, {}, temp_series, {name: fc.name+" temperatuur", color: colors.temp[idx], lineWidth: 2});
			var _press_series = $.extend(true, {}, press_series, {name: fc.name+" rõhk", color: colors.press[idx], lineWidth: 1});
			var _rain_series = $.extend(true, {}, rain_series, {name: fc.name+" sademed", color: colors.rain[idx], lineWidth: 1});

			var em = json.forecast.tabular;
			var em_get_time = function(xd) {
				return (function (d) {
					return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
				})(xd.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/));
			};
			var t = 0, i = 0, j = em.time.length;

			for (; i < j; ++i) {
				t = (em_get_time(em.time[i]["@attributes"].from).getTime())+1800000;
				_ws_series.data.push([t, my.ntof2p(em.time[i].windSpeed["@attributes"].mps)]);
				_wd_series.data.push([t, my.ntof2p(em.time[i].windDirection["@attributes"].deg)]);
				_temp_series.data.push([t, my.ntof2p(em.time[i].temperature["@attributes"].value)]);
				_press_series.data.push([t, my.ntof2p(em.time[i].pressure["@attributes"].value)]);
				_rain_series.data.push([t, my.ntof2p(em.time[i].precipitation["@attributes"].value)]);
			}

			wind_speed_options.series.push(_ws_series);

			wind_dir_options.series.push(_wd_series);

			temp_options.series.push(_rain_series);
			temp_options.series.push(_press_series);
			temp_options.series.push(_temp_series);
			if(++ajax_done===fcsources.length) get.done();
		});
	},	
	done: function() {
		ajax_done = 0;
		var i1, i2, i3;
		if(my.chartorder.indexOf("wind_speed")>=0) {
			my.charts[3] = new Highcharts.Chart(wind_speed_options);
			i1 = intPlotLine(my.charts[3], i1);
		}
		if(my.chartorder.indexOf("wind_dir")>=0) {
			my.charts[4] = new Highcharts.Chart(wind_dir_options);
			i2 = intPlotLine(my.charts[4], i2);
		}
		if(my.chartorder.indexOf("temp")>=0) {
			my.charts[5] = new Highcharts.Chart(temp_options);
			i3 = intPlotLine(my.charts[5], i3);
		}
		$("#fctitle").html(
			'Prognoos <b>'+my.fcplaces[my.fcplace].name+'</b> ' + my.getTimeStr(last_time)
			).show();
		var list = _.map(my.fcplaces,function(a){if(!my.showgroup||my.fcplaces[a.id].group===my.showgroup) {
			return '<li><a href="#" name="'+a.id+'" class="fcplace-select'+(a.id===my.fcplace?' active':'')+'">'+a.name+'</a></li>';
		}}).join("");
		$("#fcmenu").html(list);
		$("#fcsel").show();
		$(".fcplace-select").on("click",function(){
			w.ilm.setEstPlace($(this).attr('name'));
					//w.ilm.reloadest();
				});
		$("#pagelogo").html(my.logo + ' <span style="font-size:70%">' + my.getTimeStr(my.getTime())+"</span>");
	}
}

my.loadEst = function (place) {
	place = (place || my.fcplace || 'tabivere') + "/";

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

	for (var a='', i = my.fcsources.length - 1; i >= 0; i--) {
		a = my.fcsources[i];
		get[a](a, place);
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
