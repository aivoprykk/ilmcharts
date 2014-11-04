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
		var now = new Date().getTime();
		clearInterval(intval);
		removePlotLine(chart);
		addPlotLine(chart, now);
		intval = setInterval(function () {
			removePlotLine(chart);
			addPlotLine(chart, now);
		}, interval);
		return intval;
	}

	my.loadEst = function (place) {
		place = (place || my.fcplace || 'tabivere') + "/";
		//console.log("Loading yr xml " + place + " data at " + (new Date().getTime()));
		$.ajax({
			type: "get",
			url: "yr_data/" + place + "forecast_hour_by_hour.xml"
		}).done(function (xml) {
			var $xml = $(xml);
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
			
			var d;			
			var yr_ws_series = $.extend(true, {}, d_series, {name: "Yr wind",color:"#7cb5ec", lineWidth: 2});
			var yr_wd_series = $.extend(true, {}, d_series, {name: "Yr dir",color:"#7cb5ec", lineWidth: 2});
			var yr_temp_series = $.extend(true, {}, temp_series, {name: "Yr temperatuur", color: "#7cb5ec", lineWidth: 2});
			var yr_press_series = $.extend(true, {}, press_series, {name: "Yr rõhk", color: '#AA4643', lineWidth: 1});
			var yr_rain_series = $.extend(true, {}, rain_series, {name: "Yr sademed", color: '#4572A7', type: 'column', lineWidth: 0});
			
			var yr_get_time = function(xml,name) {
				return (function (d) {
						return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
                })((xml.find ? xml.find(name).text() : xml.getAttribute("from")).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/));
			};
			$xml.find('tabular time').each(function (i, times) {
				var yrd = yr_get_time(times,"from");
				d = (yrd.getTime()) + 1800000;
				//console.log("yr data " + yrd + " " + new Date(d));
				yr_ws_series.data.push([d, my.ntof2p($(times).find("windSpeed").attr("mps"))]);
				yr_wd_series.data.push([d, my.ntof2p($(times).find("windDirection").attr("deg"))]);
				yr_temp_series.data.push([d, my.ntof2p($(times).find("temperature").attr("value"))]);
				yr_press_series.data.push([d, my.ntof2p($(times).find("pressure").attr("value"))]);
				yr_rain_series.data.push([d, my.ntof2p($(times).find("precipitation").attr("maxvalue"))]);
			});
			
			wind_speed_options.series = null;
			wind_speed_options.series = [];
			wind_speed_options.series.push(yr_ws_series);
			wind_speed_options.chart.renderTo = 'wind_speed2';
			
			wind_dir_options.series = null;
			wind_dir_options.series = [];
			wind_dir_options.series.push(yr_wd_series);
			wind_dir_options.chart.renderTo = 'wind_dir2';
			
			temp_options.series = null;
			temp_options.series = [];
			temp_options.series.push(yr_rain_series);
			temp_options.series.push(yr_press_series);
			temp_options.series.push(yr_temp_series);
			temp_options.chart.renderTo = 'temp2';

			var wg_ws_series = $.extend(true, {}, d_series, {name: "WindGuru tuul",color:"#90ed7d", lineWidth: 2});
			var wg_wg_series = $.extend(true, {}, d_series, {name: "WindGuru gust",color:"#910000", lineWidth: 2, dashStyle: 'shortdot'});
			var wg_wd_series = $.extend(true, {}, d_series, {name: "WindGuru dir",color:"#434348", lineWidth: 2});
			var wg_temp_series = $.extend(true, {}, temp_series, {name: "WindGuru temperatuur", color: "#8bbc21", lineWidth: 2});
			var wg_press_series = $.extend(true, {}, press_series, {name: "WindGuru rõhk", color: '#f15c80', lineWidth: 1});
			var wg_humid_series = $.extend(true, {}, humid_series, {name: "WindGuru niiskus", color: '#C7C8CA', lineWidth: 1});
			//var wg_rain_series = $.extend(true, {}, rain_series, {name: "WindGuru sademed", type: 'column', lineWidth: 0});
			
			$.ajax({
				type: "get",
				url: "wg_data/" + place + "windguru_forecast.json",
				dataType: "jsonp",
				jsonp: "callback",
				jsonpCallback: "wg_data"
			}).done(function (json) {
				var wg = json.fcst.fcst[3],
				wgd = (function (d) {
						return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
					})(wg.initdate.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/)),
				d = (wgd.getTime()) - (new Date().getTimezoneOffset() * 60 * 1000) + 1800000,
				//console.log("wg time " + wgd + " " + new Date(d));
				t = 0, i = 0, j = wg.hours.length;
				for (; i < j; ++i) {
					if (wg.hours[i] > 72) { break; }
					//console.log("wg thing " + wg.hours[i] + " " + new Date(d));
					t = d + (wg.hours[i] * 3600 * 1000);
					wg_ws_series.data.push([t, my.conv_knot2ms(wg.WINDSPD[i])]);
					wg_wg_series.data.push([t, my.conv_knot2ms(wg.GUST[i])]);
					wg_wd_series.data.push([t, my.ntof2p(wg.WINDDIR[i])]);
					wg_temp_series.data.push([t, my.ntof2p(wg.TMP[i])]);
					wg_press_series.data.push([t, my.ntof2p(wg.SLP[i])]);
					wg_humid_series.data.push([t, my.ntof2p(wg.RH[i])]);
					//wg_rain_series.data.push([t, my.ntof2p(wg.APCP[i])]);
				}
				// windguru series: 6 for now
				wind_speed_options.series.push(wg_wg_series);
				wind_speed_options.series.push(wg_ws_series);
				
				wind_dir_options.series.push(wg_wd_series);
				
				temp_options.series.push(wg_humid_series);
				//temp_options.series.push(wg_rain_series);
				temp_options.series.push(wg_press_series);
				temp_options.series.push(wg_temp_series);
				
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
					'Prognoos <b>'+my.fcplaces[my.fcplace].name+'</b> ' + my.getTimeStr(wg.update_last,1)
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
				$('#yrmeta').html(
					'<a href="' +
						'http://www.yr.no/place/Estonia/'+my.fcplaces[my.fcplace].yrlink+'/hour_by_hour.html' + 
						'" onclick="window.open(this.href);return false;">Yr.no</a> andmed viimati uuendatud: '	+ 
						my.getTimeStr(yr_get_time($xml,'lastupdate')) +
						', Järgmine uuendus: ' +
						my.getTimeStr(yr_get_time($xml,'nextupdate'))
				);

				$('#wgmeta').html(
					'<a href="' +
						"http://www.windguru.cz/ee/?go=1&amp;sc="+my.fcplaces[my.fcplace].wglink+"&amp;wj=msd&amp;tj=c&amp;fhours=180&amp;odh=3&amp;doh=22" +
						'" onclick="window.open(this.href);return false;">Windguru.cz</a> andmed viimati uuendatud: ' + 
						my.getTimeStr(wg.update_last) +
						', Järgmine uuendus: ' + 
						my.getTimeStr(wg.update_next)
				);
			});

		});
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
