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
			chartorder : ["temp","wind_speed","wind_dir"],
			showgroup : ""
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
					this.attr[a] = (opt[a]==='none')?'':opt[a];
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
		this.fcplaces = {
			"tabivere":{id:"tabivere",name:'Saadjärv',wglink:"266923",yrlink:"Jõgevamaa/Tabivere~587488",group:"jarv"},
			"tamme":{id:"tamme",name:'Võrtsjärv',"wglink":192609,yrlink:"Tartumaa/Tamme",group:"jarv"},
			//"nina":{id:"nina",name:'Peipsi Nina',"wglink":20401,yrlink:"Tartumaa/Nina",group:"jarv"},
			"rapina":{id:"rapina",name:'Peipsi Räpina',"wglink":183648,yrlink:"Põlvamaa/Võõpsu",group:"jarv"},
			"pirita":{id:"pirita",name:'Pirita',"wglink":125320,yrlink:"Harjumaa/Pirita~798565",group:"meri"},
			"rohuneeme":{id:"rohuneeme",name:'Püünsi',"wglink":70524,yrlink:"Harjumaa/Rohuneeme",group:"meri"},
			"topu":{id:"topu",name:'Topu',"wglink":18713,yrlink:"Läänemaa/Topu",group:"meri"},
			"parnu":{id:"parnu",name:'Pärnu',"wglink":92781,yrlink:"Pärnumaa/Pärnu",group:"meri"},
			"haademeeste":{id:"haademeeste",name:'Häädemeeste',"wglink":246420,yrlink:"Pärnumaa/Häädemeeste",group:"meri"},
			"ristna":{id:"ristna",name:'Ristna',"wglink":96592,yrlink:"Hiiumaa/Ristna",group:"meri"}
		};
		this.fcplace = this.state.attr.fcplace;
		this.curplaces = {
			"emu":{id:"emu",name:"Tartu EMU",group:"jarv",link:'/weather'},
			"mnt_tamme":{id:"mnt_tamme",name:"V-Rakke MNT",group:"jarv",link:''},
			"mnt_rapina":{id:"mnt_rapina",name:"Räpina MNT",group:"jarv",link:''},
			"mnt_uhmardu":{id:"mnt_uhmardu",name:"Uhmardu MNT",group:"jarv",link:''},
			"mnt_jogeva":{id:"mnt_jogeva",name:"Jõgeva MNT",group:"jarv",link:''},
			"emhi_pirita":{id:"emhi_pirita",name:"Pirita EMHI",group:"meri",link:'/meri/vaatlusandmed/'},
			"emhi_rohuneeme":{id:"emhi_rohuneeme",name:"Püünsi EMHI",group:"meri",link:'/meri/vaatlusandmed/'},
			"emhi_topu":{id:"emhi_topu",name:"Haapsalu EMHI",group:"meri",link:'/meri/vaatlusandmed/'},
			"emhi_parnu":{id:"emhi_parnu",name:"Pärnu EMHI",group:"meri",link:'/meri/vaatlusandmed/'},
			"emhi_haademeeste":{id:"emhi_haademeeste",name:'Häädemeeste EMHI',group:"meri",link:'/meri/vaatlusandmed/'},
			"emhi_ristna":{id:"emhi_ristna",name:"Ristna EMHI",group:"meri",link:'/meri/vaatlusandmed/'}
		};
		this.curplace = this.state.attr.curplace;
		this.datamode = this.state.attr.datamode;
		this.timeframe = this.state.attr.timeframe;
		this.showgroup = this.state.attr.showgroup;
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
			var i = 0, j = input.length, sum = 0;
			for(;i<j;i++) sum += parseFloat(input[i]);
			return parseFloat((sum/j).toFixed(1));
		},
		getmax: function(input) {
			if( Object.prototype.toString.call( input ) !== '[object Array]' ) {
				return 0;
			}
			var i = 0, j = input.length, k = 0, max = 0;
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
			var places=this[name+'s'] || this.fcplaces,
			place = this[name] || this.fcplace,
			j = {}, i;
			if(d) {
				for(i in places){
					if(i === d) { j[name] = this[name] = d; break; }
				}
			}
			this.state.set(j);
			return false;
		},
		setGroup: function (d, name) {
			if(d === "" || (/^(jarv|meri)$/.test(d) && this.showgroup !== d)){
				this.showgroup = d;
				this.state.set({showgroup:(d?d:'none')});
				if(!d) return false;
				if(this.fcplaces[this.fcplace].group!==this.showgroup) this.setEstPlace(this.nextPlace());
				if(this.curplaces[this.curplace].group!==this.showgroup) this.setCurPlace(this.nextCurPlace());
			}
			return false;
		},
		nextCurPlace: function() {
			return this.nextPlace('curplace');
		},
		nextPlace: function(name) {
			name = name || 'fcplace';
			var places = this[name + 's'] || this.fcplaces,
			place = this[name] || this.fcplace,
			p = '', that = false, j = '', i;
			//console.log(JSON.stringify(places));
			for(i in places){
				if (!j && (!this.showgroup || (this.showgroup === places[i].group))) j = i;
				if (that) {
					if(!this.showgroup || (this.showgroup === places[i].group)) {
						p = i; that=false;
					}
				}
				if(i === place) that = true;
				//console.log(name + ' "' + i + '" ' + place +  " " + (that?"ready":"") + " " + p + " " + this.showgroup);
			}
			if(!p) p = j;
			//console.log("got place " + name + ' ' + p + ' from ' + place);
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
			var ret ='', dsep = "." + (d.getMonth() < 10 ? "0" : "") + (d.getMonth()+1) + ".";
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
