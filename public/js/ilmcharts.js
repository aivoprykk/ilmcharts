/*!
 * Ilmcharts v1.1.0 (http://ilm.majasa.ee)
 * Copyright 2012-2014 Aivo Pruekk
 * Licensed under MIT (https://github.com/aivoprykk/ilmcharts/blob/master/LICENSE)
 */

if (typeof jQuery === 'undefined') { throw new Error('Ilmcharts\'s JavaScript requires jQuery') }

var ilm = (function (my) {
	var w = window, doc = document;
	function State(opt) {
		opt = opt || {};
		var defaults = {
			id : 'ilmchartsstore01',
			datamode : opt.datamode||'emu',
			timeframe :  opt.timeframe||24*3600*1000,
			fcplace : opt.fcplace||'tabivere',
			curplace : opt.curplace||'emu',
			chartorder : ["temp","wind_speed","wind_dir"]
		};
		this.id = defaults.id;
		this.attr = defaults;
		return this;
	}
	State.prototype = {
		save: function(){
			if (localStorage) {
				localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
			}
			return this;
		},
		load: function(){
			if(localStorage) {
				this.set(JSON.parse(localStorage.getItem(this.id)));
			}
			return this;
		},
		set: function(opt){
			if(!opt) return this;
			var changed = false;
			for(var a in this.attr) {
				if(a !== "id" && opt[a] && opt[a] !== this.attr[a]) {
					this.attr[a] = opt[a];
					changed = true;
					console.log(a + " " + opt[a]);
				}
			}
			if (changed) this.save();
			return this;
		},
		get: function(name){
			return this.attr[name] || null;
		},
		destroy: function() {
			if (localStorage) localStorage.removeItem(this.id);
			return this;
		},
		toJSON: function() {
			var ret = {};
			for(var a in this.attr) {
				if(a !== "id") ret[a] = this.attr[a];
			}
			return ret;
		}
	};
	function App(placeholder) {
		this.state = new State().load();
		this.placeholder = placeholder || '#container';
		this.dataurl = "/cgi-bin/cpp/ilm/image.cgi?t=json";
		this.digits = 1;
		this.fcplaces = {"tabivere":{id:"tabivere",name:'Saadjärv',wglink:"266923",yrlink:"Jõgevamaa/Tabivere~587488"}, "tamme":{id:"tamme",name:'Võrtsjärv',"wglink":192609,yrlink:"Tartumaa/Tamme"}};
		this.fcplace = this.state.attr.fcplace;
		this.curplaces = {"emu":{id:"emu",name:"Tartu EMU"}};
		this.curplace = this.state.attr.curplace;
		this.datamode = this.state.attr.datamode;
		this.timeframe = this.state.attr.timeframe;
		this.lastdate = new Date().getTime();//-(4*24*3600);
		this.date = 0;
		this.start = this.lastdate;
		this.historyactive=false;
		this.logo = "Graafikud";
 		this.chartoptions = {
			chart: {
				zoomType: 'x',
				spacingRight: 20,
				maxZoom: 3600000,
				marginRight: 110,
				marginLeft: 85
			},
			xAxis: {
				type: 'datetime',
				gridLineWidth: 1
			},
			plotOptions: {
				spline: {
					lineWidth: 2,
					states: {
						hover: {
							lineWidth: 2
						}
					},
					marker: {
						enabled: false
					}
				},
				scatter: {
					lineWidth: 0,
					marker: {
						radius: 2
					}
				}
			},
			legend: {
				enabled: false
			},
			series: []
		};
		this.charts = [];
		this.chartorder = ["temp","wind_speed","wind_dir"];
		this.months = ['Jaanuar', 'Veebruar', 'Märts', 'Aprill', 'Mai', 'Juuni',
			'Juuli', 'August', 'September', 'Octoober', 'November', 'Detsember'];
		this.weekdays = ['Pühapäev', 'Esmaspäev', 'Teisipäev', 'Kolmapäev', 'Neljapäev', 'Reede', 'Laupäev'];
	}

	App.prototype = {
		reorder: function (div) {
			var el = null, i, j, co = this.chartorder;
			if(!div) { div = this.placeholder; }
			$(div).children().each(function ( k, l) {
				for (i = 0, j = l.childNodes.length; i < j; ++i){
					el = l.childNodes[i];
					if(el.classname && el.className.match(/title/)) continue;
					if(el.className && el.className.match(/meta/)) {
						break;
					}
					el = null;
				}
				for (i = 0, j = co.length; i < j; ++i) {
					l.insertBefore(doc.getElementById(co[i]+(k+1)),el);
				}
			});
		},
		loadBase: function (div) {
			var el = null, child = null, newel = null, i, j, co = this.chartorder;
			if(!div) { div = this.placeholder; }
			$(div).children().each(function ( k, l) {
				if (l.className && l.className.match(/float/)) {
					for (i = 0, j = l.childNodes.length; i < j; ++i){
						el = l.childNodes[i];
						if(el.classname && el.className.match(/title/)) continue;
						if(el.className && el.className.match(/meta/)) {
							break;
						}
						el = null;
					}
					for (i = 0, j = co.length; i < j; ++i) {
						newel = doc.createElement("div");
						newel.setAttribute("id",co[i] + (k+1));
						newel.className = "chart-frame" +((co[i].match(/_dir/))? 2 : 1);
						l.insertBefore(newel,el);
					}
				}
			});
		},
		dirs: function (dir) {
			if ((dir >= 0 && dir <= 11.25) || (dir >= 348.75 && dir <= 360) ) { return "N"; }
			if ((dir > 11.25  && dir <= 33.75)) { return "NNE"; } 
			if ((dir > 33.75  && dir <= 56.25)) { return "NE"; } 
			if ((dir > 56.25  && dir <= 78.75)) { return "ENE"; } 
			if ((dir > 78.75  && dir <= 101.25)) { return "E"; } 
			if ((dir > 101.25 && dir <= 123.75)) { return "ESE"; } 
			if ((dir > 123.75 && dir <= 146.25)) { return "SE"; } 
			if ((dir > 146.25 && dir <= 168.75)) { return "SSE"; } 
			if ((dir > 168.75 && dir <= 191.25)) { return "S"; } 
			if ((dir > 191.25 && dir <= 213.75)) { return "SSW"; } 
			if ((dir > 213.75 && dir <= 236.25)) { return "SW"; } 
			if ((dir > 236.25 && dir <= 258.75)) { return "WSW"; } 
			if ((dir > 258.75 && dir <= 281.25)) { return "W"; } 
			if ((dir > 281.25 && dir <= 303.75)) { return "WNW"; } 
			if ((dir > 303.75 && dir <= 326.25)) { return "NW"; } 
			if ((dir > 326.25 && dir <= 348.75)) { return "NNW"; } 
		},
		ntof2p: function (num) {
			if (num === null || num === undefined) { return null; }
			return parseFloat(parseFloat(num).toFixed(1));
		},	
		conv_kmh2ms: function (input) {
			var t = (parseFloat(input) * 1000) / 3600;
			return  parseFloat(t.toFixed(1));
		},	
		conv_mh2ms: function (input) {
			var t = parseFloat(input) / 2.23693629;
			return  parseFloat(t.toFixed(1));
		},	
		conv_knot2ms: function (input) {
			var t = parseFloat(input) / 1.9426;
			return  parseFloat((t + (t * 0.000639)).toFixed(1));
		},	
		conv_ms2knots: function (input) {
			var t = parseFloat(input) /  0.515;
			return  parseFloat((t + (t * 0.000639)).toFixed(1));
		},
		getWidth: function (i) {
			i = i || null;
			return (w.innerWidth) ? w.innerWidth :
				(doc.documentElement && doc.documentElement.clientWidth) ? doc.documentElement.clientWidth :
					(doc.body && doc.body.clientWidth) ? doc.body.clientWidth : i;
		},
		getavg: function (input) {
			if( Object.prototype.toString.call( input ) !== '[object Array]' ) {
				return 0;
			}
			var i=0,j=input.length,sum=0;
			for(;i<j;i++) sum += parseFloat(input[i]);
			return parseFloat((sum/j).toFixed(1));
		},
		getmax: function(input) {
			if( Object.prototype.toString.call( input ) !== '[object Array]' ) {
				return 0;
			}
			var i=0,j=input.length,k=0;max=0;
			for(;i<j;i++) {
				k = parseFloat(input[i]);
				if (max < k) max = k;
			}
			return max;
		},
		setFrame: function(d) {
			var x = '';
			if(d && /^\d*d/.test(d)) {
				x  = d.replace(/d*$/,"");
				this.timeframe = x*24*3600*1000;
			} else if (d && /^\d*h/.test(d)) {
				x  = d.replace(/h*$/,"");
				this.timeframe = x*3600*1000;
			} else if (d && /^\d+$/.test(d)) {
				this.timeframe = d;
			}
			this.state.set({'timeframe':this.timeframe});
			return false;
		},
		getFrame: function (d) {
			var f = parseInt(this.timeframe,10),
			t = f / (24*3600*1000);
			if(t % 1 === 0){
				return t + 'd';
			}
			t = f / (3600*1000);
			if (t % 1 === 0) {
				return t + 'h';
			}
			return f;
		},
		setCurPlace: function(d) {
			this.setPlace(d, 'curplace');
			return false;
		},
		setEstPlace: function(d) {
			this.setPlace(d);
			return false;
		},
		setPlace: function(d, name) {
			name = name || 'fcplace';
			places=this[name+'s'] || this.fcplaces;
			place = this[name] || this.fcplace;
			var j = {};
			if(d) {
				for(var i in places){
					if(i === d) { j[name] = this[name] = d; break; }
				}
			}
			this.state.set(j);
			return false;
		},
		nextCurPlace: function() {
			return this.nextPlace('curplace');
		},
		nextPlace: function(name) {
			name = name || 'fcplace';
			places = this[name + 's'] || this.fcplaces;
			place = this[name] || this.fcplace;
			var p = '', that = false, j = '';
			for(var i in places){
				if (!j) j = i;
				if (that) p = i;
				if(i === place) that = true;
			}
			if(!p) p = j;
			//console.log(name + ' ' + p + ' ' + place);
			return p;
		},
		setDate: function(d) {
			var ret = 0,cur = new Date().getTime();
			if(d && /^\d*-\d*-\d*/.test(d)) {
				ret = new Date(d).getTime();
			} else if(d && /^\d+$/.test(d)) {
				ret = new Date().getTime() - d;
			}
			if(ret && ret > cur){
				ret = cur;
			}
			if (ret) {
				this.historyactive=(cur-(3600*1000)>ret) ? true : false;
				this.start = this.lastdate = this.date = ret;
			}
		},
		getTimeStr: function (d, f, g) {
			d = new Date(d);
			//console.log(d);
			var ret ='';
			var dsep = "." + (d.getMonth() < 10 ? "0" : "") + (d.getMonth()+1) + ".";
			if (f) { dsep = ". " + my.months[(d.getMonth())].toLowerCase() + " "; }
			ret = (d.getDate() < 10 ? "0" : "") + d.getDate() + dsep + d.getFullYear();
			if(!g) ret += " " + (d.getHours()<10?"0":"") + d.getHours() + ":" +  (d.getMinutes()<10?"0":"") + d.getMinutes();
			return ret;
		}
    
	};
	
	if (w.ilm === undefined) {
		my = new App();
	} else {
		my = w.ilm;
	}
	//my.setDate("2014-04-25T00:00:00");
	//my.setFrame('3d');
	console.log(my.getTimeStr(my.date) + " " + my.timeframe);
	return my;
})(ilm || {});
;
(function (my) {
	var w = window, $ = w.$,
		Highcharts = w.Highcharts,
		drawupdates = 0,
		updateinterval = 60000,
		options = {};

	var normalizeData = function (data, obj) {
        var dataArray = {};
        var d;
        if(data.data){
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
		} else {
			my.datamode = "emu";
			//emu data
			var c,e,f;
			$.each(data.split("\n"),function(a, b) {
					if (b && !b.match(/^--/)) {
						c = b.split(/\s+?/);
						c[9] = (c[9] < 0) ? 0 : c[9];
						if(c[1].match(/5$/)){
							e=c;
							//console.log("viiega:"+c[1]);
						} else {
							my.lastdate=d=new Date(c[0].replace(/(\d\d\d\d)(\d\d)(\d\d)/,"$1/$2/$3")+" "+c[1]).getTime();
							//console.log(my.getTimeStr(my.lastdate) + " " + my.timeframe + " " + (my.start-my.lastdate))
							if(my.timeframe && (my.start-my.lastdate) <= my.timeframe) {
								//obj.min_ws_series.data.push([d, my.ntof2p(c[12])]);
								//console.log("wind_avg("+c[7]+" "+my.conv_knot2ms(my.ntof2p(c[7]))+" "+my.conv_kmh2ms(my.ntof2p(c[7]))+" "+my.conv_mh2ms(my.ntof2p(c[7]))+")");
								//obj.avg_ws_series.data.push([d, my.ntof2p(c[7])]);
								//obj.max_ws_series.data.push([d, my.ntof2p(c[8])]);
								
								obj.avg_ws_series.data.push([d, my.conv_kmh2ms(my.ntof2p((e) ? my.getavg([c[7], e[7]]) : c[7]))]);
								obj.max_ws_series.data.push([d, my.conv_kmh2ms(my.ntof2p((e) ? my.getmax([c[8], e[8]]) : c[8]))]);
								//obj.min_wd_series.data.push([d, my.ntof2p(c[12])]);
								obj.avg_wd_series.data.push([d, my.ntof2p((e) ? my.getavg([c[9], e[9]]) : c[9])]);
								//obj.max_wd_series.data.push([d, my.ntof2p(b.max_wind_direction)]);
								obj.avg_temp_series.data.push([d,my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2])]);
								obj.avg_dp_series.data.push([d, my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6])]);
								obj.avg_wc_series.data.push([d, my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3])]);
								obj.avg_rain_series.data.push([d, my.ntof2p((e) ? my.getavg([c[10], e[10]]) : c[10])]);
								obj.avg_humid_series.data.push([d, my.ntof2p((e) ? my.getavg([c[5], e[5]]) : c[5])]);
								obj.avg_press_series.data.push([d, my.ntof2p((e) ? my.getavg([c[11], e[11]]) : c[11])]);
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
			if (s.avg_temp_series.data.length) {
			options.temp.title.text =
				" Temperatuur"+(!my.historyactive? " [ <b>" + s.avg_temp_series.data[s.avg_temp_series.data.length - 1][1] + "</b> °C ]":"")+"," +
					" Rõhk"+(!my.historyactive? " [ <b>" + s.avg_press_series.data[s.avg_press_series.data.length - 1][1] + "</b> hPa ]":"")+"," +
					" Niiskus"+(!my.historyactive? " [ <b>" + s.avg_humid_series.data[s.avg_humid_series.data.length - 1][1] + "</b> % ]":"");
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
			
			
			options.wind_speed.chart.renderTo = 'wind_speed1';
			options.wind_dir.chart.renderTo = 'wind_dir1';
			options.temp.chart.renderTo = 'temp1';
			
			my.charts[0] = new Highcharts.Chart(options.wind_speed);
			my.charts[1] = new Highcharts.Chart(options.wind_dir);
			my.charts[2] = new Highcharts.Chart(options.temp);
			$('#curmeta').html(
				'<a href="http://energia.emu.ee/weather/'  +
					'" onclick="window.open(this.href);return false;">EMU.ee</a>, andmed viimati uuendatud: ' + 
					//new Date(my.lastdate).toLocaleString() +
					my.getTimeStr(my.lastdate) +
					', Järgmine uuendus: ' +
					//new Date(my.lastdate + updateinterval).toLocaleString() +
					my.getTimeStr(my.lastdate + updateinterval)
			);
    };
    
    var setEmuFileName = function (d) {
    	d = new Date(d);
		var daystr = d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1) + "-" + (d.getDate() < 10 ? "0" : "") + d.getDate();
		return "emu_data/ARC-"+daystr+'.txt';
    };
    
	my.loadCur = function (url) {
		var d, now;
		now = d = (my.date > 0) ? new Date(my.date).getTime() : new Date().getTime();
		//url = url || my.dataurl + '&hours=7&res=10m&wind_speed=1&dewpoint=1&outdoor_temperature=1&windchill=1&wind_direction=1&absolute_pressure=1';
		//console.log("Loading all data at " + (now));
		//fake data...
		//ajaxopt.delta="2y";
		var json_full="";
		var cb = function(d) {
			if(my.curplace === "emu") {
				ajaxopt={};
				my.dataurl = setEmuFileName(d);
			}
			//console.log("Get source: " + my.dataurl);
			$.ajax({url: my.dataurl, data: ajaxopt}).done(function (json) {
				json_full += json;
				if(my.curplace === "emu" && (d-1+(24 * 3600 * 1000)) < now) {
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
;(function (my) {
	var w = window,
		$ = w.$,
		Highcharts = w.Highcharts,
		updateinterval = 60000,
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
			min: 0,
			gridLineWidth: 1
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
		yAxis: [{
			labels: {
				formatter: function () {
					return this.value + '°C';
				}
			},
			title: {
				text: null
			}
		}, {
			gridLineWidth: 0,
			labels: {
				formatter: function () {
					return this.value + 'hPa';
				},
				style: {
					color: '#89A54E'
				}
			},
			title: {
				text: null
			},
			opposite: true
		}, {
			gridLineWidth: 0,
			max: 100,
			labels: {
				formatter: function () {
					return this.value + '%';
				},
				style: {
					color: "#4572a7"
				}
			},
			title: {
				text: null
			},
			opposite: true
		}, {
			gridLineWidth: 0,
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
						color: "#8bbc21"
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
						color: 'rgb(159,176,189)'
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
			var yr_ws_series = $.extend(true, {}, d_series, {name: "Yr wind"});
			var yr_wd_series = $.extend(true, {}, d_series, {name: "Yr dir"});
			var yr_temp_series = $.extend(true, {}, temp_series, {color: "#2f7ed8", name: "Yr temperatuur"});
			var yr_press_series = $.extend(true, {}, press_series, {color: '#AA4643', name: "Yr rõhk"});
			var yr_rain_series = $.extend(true, {}, rain_series, {color: '#4572A7', type: 'column', name: "Yr sademed", lineWidth: 0});
			
			var yr_get_time = function(xml,name) {
				return (function (d) {
						return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
                })((xml.find ? xml.find(name).text() : xml.getAttribute("from")).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/));
			};
			$xml.find('tabular time').each(function (i, times) {
				//var yrd = (function (d) {
				//		return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
				//	})(times.getAttribute("from").match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/));
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
			temp_options.series.push(yr_temp_series);
			temp_options.series.push(yr_press_series);
			temp_options.chart.renderTo = 'temp2';

			var wg_ws_series = $.extend(true, {}, d_series, {name: "WindGuru tuul"});
			var wg_wg_series = $.extend(true, {}, d_series, {name: "WindGuru gust", dashStyle: 'shortdot'});
			var wg_wd_series = $.extend(true, {}, d_series, {name: "WindGuru dir"});
			var wg_temp_series = $.extend(true, {}, temp_series, {color: "#8bbc21", name: "WindGuru temperatuur"});
			var wg_press_series = $.extend(true, {}, press_series, {name: "WindGuru rõhk"});
			var wg_humid_series = $.extend(true, {}, humid_series, {name: "WindGuru niiskus", color: 'rgb(159,176,189)'});
			//var wg_rain_series = $.extend(true, {}, rain_series, {name: "WindGuru sademed", type: 'column', lineWidth: 0});
			
			$.ajax({
				type: "get",
				url: "wg_data/" + place + "windguru_forecast.json",
				dataType: "jsonp",
				jsonp: "callback",
				jsonpCallback: "wg_data"
			}).done(function (json) {
				var wg = json.fcst.fcst[3];
				var wgd = (function (d) {
						return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
					})(wg.initdate.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/));
				d = (wgd.getTime()) - (new Date().getTimezoneOffset() * 60 * 1000) + 1800000;
				//console.log("wg time " + wgd + " " + new Date(d));
				var t = 0;
				for (var i = 0, j = wg.hours.length; i < j; ++i) {
					if (wg.hours[i] > 72) { break; }
					//console.log("wg thing " + wg.hours[i] + " " + new Date(d));
					t = d + (wg.hours[i] * 3600 * 1000);
					wg_ws_series.data.push([t, my.conv_knot2ms(wg.WINDSPD[i])]);
					wg_wg_series.data.push([t, my.conv_knot2ms(wg.GUST[i])]);
					wg_wd_series.data.push([t, my.ntof2p(wg.WINDDIR[i])]);
					wg_temp_series.data.push([t, my.ntof2p(wg.TMP[i])]);
					wg_press_series.data.push([t, my.ntof2p(wg.SLP[i])]);
					//wg_humid_series.data.push([t, my.ntof2p(wg.RH[i])]);
					//wg_rain_series.data.push([t, my.ntof2p(wg.APCP[i])]);
				}
				// windguru series: 6 for now
				wind_speed_options.series.push(wg_wg_series);
				wind_speed_options.series.push(wg_ws_series);
				
				wind_dir_options.series.push(wg_wd_series);
				
				//temp_options.series.push(wg_humid_series);
				//temp_options.series.push(wg_rain_series);
				temp_options.series.push(wg_temp_series);
				temp_options.series.push(wg_press_series);
				
				my.charts[3] = new Highcharts.Chart(wind_speed_options);
				my.charts[4] = new Highcharts.Chart(wind_dir_options);
				my.charts[5] = new Highcharts.Chart(temp_options);
				
				var i1, i2, i3;
				i1 = intPlotLine(my.charts[3], i1);
				i2 = intPlotLine(my.charts[4], i2);
				i3 = intPlotLine(my.charts[5], i3);
				$("#fctitle").html(
					'Prognoos <b>'+my.fcplaces[my.fcplace].name+'</b> ' + my.getTimeStr(wg.update_last,1)
				).show();
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
;(function (my) {
	var w = window, $ = w.$;
	my.lingid = my.lingid || {
		JSON: {
			'list': [ 
				{'name':'Ilmalingid',
				'list': [ 
				{ 'name': 'EMHI','url':'http://www.ilmateenistus.ee/','list': [
				{'href':'ilm/ilmavaatlused/vaatlusandmed/tuul/','title':"Ilmavaatlused - tuul",'id':'emhi_kaart'},
				{'href':'ilm/prognoosid/mudelprognoosid/eesti/#layers/tuul10ms,tuul10mb','title':"Prognoos - Suur Hirlam",'id':'emhi_hirlam_suur'},
				]},
				{'name': "WeatherOnline",'url':'http://www.weatheronline.co.uk/','list': [
				{'href':'marine/weather?LEVEL=3&LANG=en&MENU=0&TIME=18&MN=gfs&WIND=g005','title':"Soome Laht",'id':'weatheronline_sl'},
				]},
				{'name': "WindGuru",'url':'http://www.windguru.cz/','list': [
				{'href':'int/?go=1&amp;lang=ee&amp;wj=msd&amp;tj=c&amp;odh=3&amp;doh=22&amp;fhours=180&amp;vp=1&amp;pi=2&amp;pu=413733','title':"Eesti Meri",'id':'windguru_meri'},
				{'href':'int/?go=1&amp;lang=ee&amp;wj=msd&amp;tj=c&amp;odh=3&amp;doh=22&amp;fhours=180&amp;vp=1&amp;pi=1&amp;pu=413733','title':"Sisej&auml;rved",'id':'windguru_jarved'},
				{'href':'int/?go=1&amp;lang=ee&amp;sc=266923&amp;wj=msd&amp;tj=c&amp;odh=3&amp;doh=22&amp;fhours=180','title':"Saadj&auml;rv",'id':'windguru_saadjarv'},
				{'href':'int/?go=1&amp;lang=ee&amp;sc=192609&amp;wj=msd&amp;tj=c&amp;odh=3&amp;doh=22&amp;fhours=180','title':"V&otilde;rtsj&auml;rv",'id':'windguru_vortsjarv'},
				{'href':'int/?go=1&amp;lang=ee&amp;sc=365700&amp;wj=msd&amp;tj=c&amp;odh=3&amp;doh=22&amp;fhours=180','title':"Tartu",'id':'windguru_tartu'},
				]},
				{'name': "YR.no",'url':'http://www.yr.no/place/Estonia/','list': [
				{'href':'Tartumaa/Tartu/hour_by_hour.html','title':"Tartu",'id':'yr_tartu'},
				{'href':'Tartumaa/Tamme/hour_by_hour.html','title':"Tamme",'id':'yr_tamme'},
				{'href':'Jõgevamaa/Tabivere~793956/hour_by_hour.html','title':"Tabivere",'id':'yr_tabivere'},
				{'href':'Harjumaa/Tallinn/hour_by_hour.html','title':"Tallinn",'id':'yr_tallinn'},
				]},
				{'name': 'GisMeteo.ru','url':'http://www.gismeteo.ru/towns/','list': [
				{'href':'26231.htm','title':"P&auml;rnu",'id':'gismeteo_parnu'},
				{'href':'26038.htm','title':"Tallinn",'id':'gismeteo_tallinn'},
				{'href':'26242.htm','title':"Tartu",'id':'gismeteo_tartu'},
				]},
				{'name': 'Meteo.pl','url':'http://new.meteo.pl/um/php/meteorogram_map_um.php?lang=en&ntype=0u','list': [
				{'href':'&row=227&col=325','title':"Saadj&auml;rv",'id':'meteopl_saadjarv'},
				{'href':'&row=234&col=318','title':"Võrtsj&auml;rv",'id':'meteopl_vortsjarv'},
				{'href':'&row=213&col=332','title':"Peipsi Mustvee",'id':'meteopl_peipsi'},
				]},
				{'name': 'Windfinder.com','url':'http://www.windfinder.com/forecast/','list': [
				{'href':'aeksi_saadjaerv','title':"Saadj&auml;rv",'id':'windfinder_saadjarv'},
				{'href':'tartu_airport','title':"Tartu",'id':'windfinder_tartu'},
				{'href':'mustvee_peipus&wf_cmp=2','title':"Mustvee Peipsi",'id':'windfinder_mustvee'},
				]},
				{'name': 'Muud','url':'http://','list':[
				{'href':'d.naerata.eu/','title':"Naerata.eu",'id':'naerata'},
				{'href':'teeinfo.evenet.ee/?mapdatatype=9','title':"Teeinfo",'id':'teeinfo'},
				{'href':'surf.paper.ee/','title':"Surf.Paper.EE",'id':'paper'},
				{'href':'palts.com/a/et_EE/ilmajaam/','title':"Palts.COM",'id':'palts'},
				{'href':'ilm.zoig.ee/','title':"Zoig.EE",'id':'zoig','app':'?k=516'},
				{'href':'http://www.kalastusinfo.ee/sisu/ilm/ilm-peipsi-jarvel.php','title':"Peipsi Ilmajaamad",'id':'kalastusinfo'},
				{'href':'www.wunderground.com/global/stations/26242.html','title':"WUnderground Tartu",'id':'wground'},
				{'href':'http://www.timeanddate.com/worldclock/astronomy.html?n=242','title':"Päikesetõus/loojang",'id':'sunclock'},
				]},
				]},
				{'name':'Surfilingid',
				'list':[
				{'name':'Eesti','url':'http://','list': [ 
				{'href':'www.surf.ee/chat/','title':"Surf.ee chat",'id':'surfichat'},
				{'href':'www.surf.ee/turg/','title':"Surf.ee turg",'id':'surfiturg'},
				{'href':'www.lesurf.ee/','title':"L&otilde;una surfarid",'id':'lesurf'},
				{'href':'www.purjelaualiit.ee/','title':"Eesti Purjelaualiit",'id':'purjelaualiit'},
				{'href':'www.gps-speedsurfing.com/','title':"GPS Speedsurfing",'id':'gps-speedsurfing'},
				]},
				]}
			]
		},
		process: function(f,u){
			var t=this,s='',i=0,patt=new RegExp("^http");
			u=(u === undefined)?'':u;
			if(f.href!==null && f.href){
				s +='<li>';
				s +='<a href="' +
					((patt.test(f.href) === false)?u:'')+f.href +
					((f.title)?'" title="'+f.title:'') +
					((f.id)?'" id="'+f.id:'') +
					'" onclick="'+'a=\''+((f.app)?f.app:'')+'\';return openNew(this.href+a);">';
				s +=((f.name)?f.name:f.title)+'</a></li>';
			} else if(f.list){
				if(f.name) { 
					s+='<div class="lingid">';
					if(!f.list[0].href) s+='<div class="ok">';
					s+= f.name;
					if(!f.list[0].href) s+= '</div>';
				}
				if(f.url){ s+='<ul>'; }
				for(i in f.list) { s+=t.process(f.list[i],f.url); }
					if(f.url){ s+='</ul>'; }
					if(f.name) {
					s+='</div>';
				}
			}
			return s;
		}
	};
   
	return my;

})(ilm || {});
;(function (w) {
	var $ = w.$,
    d = document,
    e = d.documentElement,
    g = d.getElementsByTagName('body')[0],
	contid = 0;
	function fixCharts(width, fn) {
		$(fn).css("width", width);
		$(d).ready(function () {
				var inner = $(fn).width();
				setTimeout(function () {
					$.each(w.ilm.charts, function (i, obj) {
						obj.setSize($(fn).width() - 6, obj.containerHeight, false);
					});
				}, 500);
			});
	}
	function setWidth() {
		console.log(w.ilm.getWidth());
		var inner = ((w.ilm.getWidth() < 1024) ? "100" : "50") + "%";
		$('.float').each(function () {
			fixCharts(inner, this);
		});
	}
	w.ilm.popup="";
	w.ilm.Options = function(state){
		var t = this, f = $("#lingid"), g = $("#sl"), html = '', z = '';
		g.html("Seaded (klikk varjamiseks)");
		var getattr = function (base) {
			html = '';
			if (base) {
				for(var i in base) {
					if(typeof base[i] === 'object') html += '<div>'+i + " " + getattr(base[i]) + '</div>';
					else html = '<div>'+i+" "+base[i]+"</div>";
				}
			}
			return html;
		};
		if(w.ilm.state.attr) {
			z = w.ilm.getFrame();
			//html = getattr(w.ilm.state.attr);
			html += '<div><label for="timeframe">Ajaraam</label> <select onchange="ilm.setFrame(this.options[this.selectedIndex].value);ilm.reload();return false;" id="timeframe" name="timeframe">' +
				'<option value="1d"' + (z==='1d' ? ' selected' : '') + '>1 päev</option><option value="2d"'+(z==='2d'?' selected':'')+'>2 päeva</option><option value="3d"'+(z==='3d'?' selected':'')+'>3 päeva</option>' +
				'</select></div>';
			html += '<div><label for="forecast">Ennustus</label> <select onchange="ilm.setEstPlace(this.options[this.selectedIndex].value);ilm.reloadest();return false;" id="forecast" name="forecast">';
			html += '<option value="tabivere"'+(ilm.fcplace==='tabivere'?' selected':'')+'>Saadjärv</option><option value="tamme"'+(ilm.fcplace==='tamme'?' selected':'')+'>Võrtsjärv Tamme</option>';
			html += '</select></div>';
		} else {
			html = "<div>Siia tulevad seaded</div>";
		}
		f.html(html);
		return false;
	};
	w.ilm.Lingid = function (state) {
		var t = this, f = $("#lingid"), g = $("#sl");
		g.html("Lingid (klikk varjamiseks)");
		f.html(w.ilm.lingid.process(w.ilm.lingid.JSON));
		return false;		
	};
	w.ilm.Popup = function(name, cb) {
		var v = $("#popup");
		if(!v) return false;
		var b = $("#bghide"), y = w.innerHeight || e.clientHeight || g.clientHeight,
		act = v.attr("name");
		if (act) $("#ilm-" + act).removeClass("active");
		if(name && (!act || (act && act !== name))) {
			b.css({height : $(d).height(), position : 'absolute', left : 0, top : 0}).show();
			v.attr("name", name);
			$("#ilm-" + name).addClass("active");
			if(cb) cb.call(this, name);
			v.css({top : ((y/2) - (v.height()/2)) + $(w).scrollTop()}).show();
		}
		else if(v.is(":visible")) {
			v.hide();
			b.hide();
			v.attr("name", "");
		}
		return false;
	};
	$(d).ready(function () {
		$("#pagelogo").html(ilm.logo);
		//setWidth();
		$("#ilm-lingid").click(function(e){
			//ilm.showLinks();
			w.ilm.Popup("lingid",w.ilm.Lingid);
			return false;
		});
		$("#ilm-seaded").click(function(e){
			w.ilm.Popup("seaded",w.ilm.Options);
			return false;
		});
		$("#fctitle").on("click",function(){
			w.ilm.setEstPlace(w.ilm.nextPlace());
			w.ilm.reloadest();
			return false;
		});
		$("#datepicker").datepicker({
			dateFormat: 'yy-mm-dd',
			onSelect: function(dateText, inst) {
				w.ilm.setDate(dateText+"T00:00:00");
				w.ilm.reload();
			}
		});
		$("#curtime").on("click",function(){
			$("#datepicker").datepicker('show');
		});
		$("#curplace").on("click",function(){
			w.ilm.setCurPlace(w.ilm.nextCurPlace());
			w.ilm.reload();
			return false;
		});
		w.ilm.loadBase();
		w.ilm.loadInt(1000 * 60); // 1min
		w.ilm.loadEstInt(1000 * 60 * 10); // 10min
		$('#backgr').css({"display" : "block"});
		$(w).on("keydown", function (e) {
			//w.console.log("pressed" + e.keyCode);
			var obj = $("#popup");
			if(!obj) return;
			if (e.keyCode === 27 || e.keyCode === 13 ) {
				w.ilm.Popup("lingid", w.ilm.Lingid);
			}
			/*if (e.keyCode === 27 && obj.style.display === "block") {
				w.ilm.showLinks();
			}
			else if (e.keyCode === 13 && obj.style.display === "none") {
				w.ilm.showLinks();
			}*/
		});
	});
})(window);