/*!
 * Ilmcharts v1.1.7 (http://ilm.majasa.ee)
 * Copyright 2012-2016 Aivo Pruekk
 * Licensed under MIT (https://github.com/aivoprykk/ilmcharts/blob/master/LICENSE)
 */

if (typeof jQuery === 'undefined') { throw new Error('Ilmcharts\'s JavaScript requires jQuery') }

var ilm = (function (my) {
	var w = window, doc = document, loc = w.location;
	function State(opt) {
		opt = opt || {};
		var defaults = {
			id : 'ilmchartsstore01',
			datamode : opt.datamode||'emu',
			timeframe :  opt.timeframe||24*3600*1000,
			fcplace : opt.fcplace||'tabivere',
			curplace : opt.curplace||'emu',
			chartorder : opt.chartorder || ["temp","wind_speed","wind_dir"],
			showgroup : opt.showgroup || "",
			binded : opt.binded || false,
			linksasmenu : opt.linksasmenu || false,
			timezone: opt.timezone || 2
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
				if(a !== "id" && (opt[a] || typeof opt[a] === 'boolean') && opt[a] !== this.attr[a]) {
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
		this.graphs = ["temp","wind_speed","wind_dir"];
		this.fcplaces = {
			//"tartu":{id:"tartu",name:'Tartu',wglink:"266923",yrlink:"Tartu",group:"jarv",bind:"tartu"},
			"tabivere":{id:"tabivere",name:'Saadjärv',wglink:"266923",yrlink:"Jõgevamaa/Tabivere~587488",group:"jarv",bind:"emu"},
			"tamme":{id:"tamme",name:'Võrtsjärv',"wglink":192609,yrlink:"Tartumaa/Tamme",group:"jarv",bind:"mnt_tamme"},
			//"nina":{id:"nina",name:'Peipsi Nina',"wglink":20401,yrlink:"Tartumaa/Nina",group:"jarv"},
			"rapina":{id:"rapina",name:'Peipsi Räpina',"wglink":183648,yrlink:"Põlvamaa/Võõpsu",group:"jarv",bind:"mnt_rapina"},
			"pirita":{id:"pirita",name:'Pirita',"wglink":125320,yrlink:"Harjumaa/Pirita~798565",group:"meri",bind:"emhi_pirita"},
			"rohuneeme":{id:"rohuneeme",name:'Püünsi',"wglink":70524,yrlink:"Harjumaa/Rohuneeme",group:"meri",bind:"emhi_rohuneeme"},
			"topu":{id:"topu",name:'Topu',"wglink":18713,yrlink:"Läänemaa/Topu",group:"meri",bind:"emhi_topu"},
			"parnu":{id:"parnu",name:'Pärnu',"wglink":92781,yrlink:"Pärnumaa/Pärnu",group:"meri",bind:"emhi_parnu"},
			"haademeeste":{id:"haademeeste",name:'Häädemeeste',"wglink":246420,yrlink:"Pärnumaa/Häädemeeste",group:"meri",bind:"emhi_haademeeste"},
			"ristna":{id:"ristna",name:'Ristna',"wglink":96592,yrlink:"Hiiumaa/Ristna",group:"meri",bind:"emhi_ristna"}
		};
		this.fcplace = this.state.attr.fcplace;
		this.curplaces = {
			"emu":{id:"emu",name:"Tartu EMU",group:"jarv",link:'/weather',bind:"tabivere"},
			"ut_tartu":{id:"ut_tartu",name:"Tartu UT",group:"jarv",link:'',bind:"tartu"},
			/*"zoig_vortsjarv":{id:"zoig_vortsjarv",name:"Tamme Zoig",group:"jarv",link:'/vortsjarv',bind:"tamme"},*/
			/*"zoig_topu":{id:"zoig_topu",name:"Topu Zoig",group:"meri",link:'/topu',bind:"topu"},*/
			/*"zoig_rapina":{id:"zoig_rapina",name:"Räpina Zoig",group:"jarv",link:'/rapina',bind:"rapina"},*/
			/*"mnt_tartu":{id:"mnt_tartu",name:"Tartu MNT",group:"jarv",link:'',bind:''},*/
			"mnt_tamme":{id:"mnt_tamme",name:"V-Rakke MNT",group:"jarv",link:'',bind:"tamme"},
			"mnt_rapina":{id:"mnt_rapina",name:"Räpina MNT",group:"jarv",link:'',bind:"rapina"},
			"mnt_uhmardu":{id:"mnt_uhmardu",name:"Uhmardu MNT",group:"jarv",link:''},
			"mnt_jogeva":{id:"mnt_jogeva",name:"Jõgeva MNT",group:"jarv",link:''},
			"emhi_pirita":{id:"emhi_pirita",name:"Pirita EMHI",group:"meri",link:'/meri/vaatlusandmed/',bind:"pirita"},
			"emhi_rohuneeme":{id:"emhi_rohuneeme",name:"Püünsi EMHI",group:"meri",link:'/meri/vaatlusandmed/',bind:"rohuneeme"},
			"emhi_topu":{id:"emhi_topu",name:"Haapsalu EMHI",group:"meri",link:'/meri/vaatlusandmed/',bind:"topu"},
			"emhi_parnu":{id:"emhi_parnu",name:"Pärnu EMHI",group:"meri",link:'/meri/vaatlusandmed/', bind:"parnu"},
			"emhi_haademeeste":{id:"emhi_haademeeste",name:'Häädemeeste EMHI',group:"meri",link:'/meri/vaatlusandmed/',bind:"haademeeste"},
			"emhi_ristna":{id:"emhi_ristna",name:"Ristna EMHI",group:"meri",link:'/meri/vaatlusandmed/',bind:"ristna"}
		};
		this.timezone = this.state.attr.timezone;
		this.addDst = this.isDst();
		this.curplace = this.state.attr.curplace;
		this.datamode = this.state.attr.datamode;
		this.timeframe = this.state.attr.timeframe;
		this.showgroup = this.state.attr.showgroup;
		this.binded = this.state.attr.binded;
		this.linksasmenu = this.state.attr.linksasmenu;
		this.lastdate = this.getTime();//-(4*24*3600);
		this.date = 0;
		this.start = this.lastdate;
		this.historyactive=false;
		this.logo = "Ilmainfo";
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
		this.chartorder = this.state.attr.chartorder;
		this.months = ['Jaanuar', 'Veebruar', 'Märts', 'Aprill', 'Mai', 'Juuni',
			'Juuli', 'August', 'September', 'Oktoober', 'November', 'Detsember'];
		this.weekdays = ['Pühapäev', 'Esmaspäev', 'Teisipäev', 'Kolmapäev', 'Neljapäev', 'Reede', 'Laupäev'];
		if(loc.hash) this.hash_data();
	}

	App.prototype = {
		hash_data: function(){
			var changed={};
			//if(!loc.hash) return false;
			if(loc.hash){
				var a = loc.hash.substring(1).split(/[\&|\/]/);
				var i=0;
				var j=a.length;
				var places=Object.keys(this.fcplaces);
				if(j){
					for(;i<j;++i){
						var b = a[i].split("=");
						if(b[0]){
							if((/aeg/.test(b[0]) && b[1]) || /\d*-\d*-\d/.test(b[0])){
								changed.aeg = b[1]||b[0];
							} else if((/koht/.test(b[0]) && b[1]) || places.indexOf(b[0])>=0){
								this.setEstPlace(b[1]||b[0], "ei");
								changed.place = b[1]||b[0];
							} else if((/raam/.test(b[0]) && b[1]) || /\d*[dh]/.test(b[0])){
								changed.raam = b[1]||b[0];
							}
						}
					}
					//console.log(this.date);
				}
			}
			this.setFrame(changed.raam,"ei","ei");
			this.setDate(changed.aeg,"ei");
			this.setEstPlace(changed.place,"ei");
			return false;
		},
		graph_name: function(name) {
				return (name==='wind_speed') ? 'Tuule kiirus' : 
					(name==='wind_dir') ? 'Tuule suund' : 'Temperatuur';
		},
		reorder: function (div) {
			var el = null, id = null, i, j, co = this.chartorder, a;
			if(!div) { div = this.placeholder; }
			$(div).children().each(function(k, l) {
				if (l.className && /float/.test(l.className)) {
					a=[];
					_.each(l.childNodes, function(i) {
						if(i && (j = i.className || "")){
							if(/meta/.test(j)) el = i;
							if(/movable/.test(j)) a.push(i);
						}
					});
					_.each(a,function(i){
						//console.log(i);
						l.removeChild(i);
						i=null;
					});
					for (i = 0, j = co.length; i < j; ++i) {
						id = doc.getElementById(co[i]+(k+1));
						//console.log(co[i]+(k+1));
						if(!id) {
							id = doc.createElement("div");
							id.setAttribute("id",co[i] + (k+1));
							id.className = "movable chart-frame" +((co[i].match(/_dir/))? 2 : 1);
						}
						l.insertBefore(id,el);
					}
					if(k===0) my.reload();
					else my.reloadest();
				}
			});
		},
		loadBase: function (div) {
			var el = null, newel = null, i, j, co = this.chartorder;
			if(!div) { div = this.placeholder; }
			$(div).children().each(function ( k, l) {
				if (l.className && l.className.match(/float/)) {
					for (i = 0, j = l.childNodes.length; i < j; ++i){
						el = l.childNodes[i];
						if(el.classname && /(title|datepicker)/i.test(el.className)) continue;
						if(el.className && el.className.match(/meta/)) {
							break;
						}
						el = null;
					}
					for (i = 0, j = co.length; i < j; ++i) {
						newel = doc.getElementById(co[i]+(k+1));
						if(!newel){
							newel = doc.createElement("div");
							newel.setAttribute("id",co[i] + (k+1));
							newel.className = "movable chart-frame" +((co[i].match(/_dir/))? 2 : 1);
						}
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
		ntof2p: function (input) {
			if (input  === "-" || input === "" || input === null || input === undefined) { return null; }
			if(Object.prototype.toString.call(input) === '[object String]'&& /^0(\d+\.)/.test(input)) input=input.replace(/^0(\d+\.)/,"-$1");
			return parseFloat(parseFloat(input).toFixed(1));
		},	
		conv_kmh2ms: function (input) {
			if (input  === "-" || input === "" || input === null || input === undefined) { return null; }
			var t = (parseFloat(input) * 1000) / 3600;
			return  parseFloat(t.toFixed(1));
		},	
		conv_mh2ms: function (input) {
			if (input  === "-" || input === "" || input === null || input === undefined) { return null; }
			var t = parseFloat(input) / 2.23693629;
			return  parseFloat(t.toFixed(1));
		},	
		conv_knot2ms: function (input) {
			if (input  === "-" || input === "" || input === null || input === undefined) { return null; }
			var t = parseFloat(input) / 1.9426;
			return  parseFloat((t + (t * 0.000639)).toFixed(1));
		},	
		conv_ms2knots: function (input) {
			if (input  === "-" || input === "" || input === null || input === undefined) { return null; }
			var t = parseFloat(input) /  0.515;
			return  parseFloat((t + (t * 0.000639)).toFixed(1));
		},
		getWidth: function (i) {
			i = i || null;
			return (w.innerWidth) ? w.innerWidth :
				(doc.documentElement && doc.documentElement.clientWidth) ? doc.documentElement.clientWidth :
					(doc.body && doc.body.clientWidth) ? doc.body.clientWidth : i;
		},
		wdavg: function (wd, ws){
			if( Object.prototype.toString.call( wd ) !== '[object Array]' ) {
				return 0;
			}
			ws = ws || [];
			var i = 0, sins = 0, coss = 0, count = wd.length, num =count, c = 0, ac=0, as=0;
			for(;i<count;++i) {
				if (wd[i]  === "-" || wd[i] === "" || wd[i] === null || wd[i] === undefined) { --num; continue; }
				sins += (ws[i] ? ws[i] : 1) * Math.sin(wd[i]*Math.PI/180);
				coss += (ws[i] ? ws[i] : 1) * Math.cos(wd[i]*Math.PI/180);
			}
			as = (-1*(1/num)*sins);
			ac = (-1*(1/num)*coss);
			if(as===0){
				if(ac < 0) c = 360;
				else if(ac > 0) c = 180;
				else c = 0;
			} else{
				c = 90 - (Math.atan(ac/as)*180/Math.PI);
				if(as > 0) c += 180;
			}
			return c ? parseFloat(c.toFixed(1)) : 0;
		},
		getavg: function (input) {
			if( Object.prototype.toString.call( input ) !== '[object Array]' ) {
				return 0;
			}
			var i = 0, j = input.length, num=j, sum = 0;
			for(;i<j;i++) {
				if (input[i]  === "-" || input[i] === "" || input[i] === null || input[i] === undefined) { --num; continue; }
				if(Object.prototype.toString.call(input[i]) === '[object String]'&& /^0(\d+\.)/.test(input[i])) input[i]=input[i].replace(/^0(\d+\.)/,"-$1");
				sum += parseFloat(input[i]);
			}
			if(!num) return null;
			return parseFloat((sum/num).toFixed(1));
		},
		getmax: function(input) {
			if( Object.prototype.toString.call( input ) !== '[object Array]' ) {
				return 0;
			}
			var i = 0, j = input.length, num = j, k = 0, max = 0;
			for(;i<j;i++) {
				if (input[i]  === "-" || input[i] === "" || input[i] === null || input[i] === undefined) { --num; continue; }
				k = parseFloat(input[i]);
				if (max < k) max = k;
			}
			if(!num) return null;
			return max;
		},
		setFrame: function(d, persist, load) {
			var x = '';
			persist=persist||"ja";
			load=load||'ja';
			if(d && /^\d*d/.test(d)) {
				x  = d.replace(/d*$/,"");
				this.timeframe = x*24*3600*1000;
			} else if (d && /^\d*h/.test(d)) {
				x  = d.replace(/h*$/,"");
				this.timeframe = x*3600*1000;
			} else if (d && /^\d+$/.test(d)) {
				this.timeframe = d;
			}
			if(persist==="ja") this.state.set({'timeframe':this.timeframe});
			else if(!d) this.timeframe = this.state.attr.timeframe;
			if(load==='ja') this.doReload("curplace");
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
		setCurPlace: function(d, persist, load) {
			this.setPlace(d, 'curplace', persist, load);
			return false;
		},
		setEstPlace: function(d, persist, load) {
			this.setPlace(d, 'fcplace', persist, load);
			return false;
		},
		setPlace: function(d, name, persist, load) {
			name = name || 'fcplace';
			persist=persist||"ja";
			load=load||'ja';
			var places=this[name+'s'] || this.fcplaces,
			place = this[name] || this.fcplace,
			j = {}, i,reload="";
			if(name==='fcplace' && d){
				if(d==='tartu'||d==='saadjarv') d='tabivere';
				else if(d==='vortsjarv') d='tamme';
				else if(d==='haapsalu') d='topu';
				else if(d==='tallinn') d='pirita';
			}
			if(!d) d = this.state.attr[name];
			if(d) {
				for(i in places){
					if(i === d) { 
						this[name] = d;
						if(this.state.attr[name] !== d) j[name] = d;
						reload = name;
						if(this.binded && places[i].bind) {
							var other = /fc/.test(name)?'curplace':'fcplace';
							this[other] = places[i].bind;
							if(this.state.attr[other] !== places[i].bind) j[other] = places[i].bind;
							reload = "both";
						}
						break;
					}
				}
			}
			if(reload){
				if(persist==="ja") this.state.set(j);
				if(load==="ja") this.doReload(reload);
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
		doReload: function (reload){
			if(!w.ilm||!w.ilm.reload) return false;
			if(reload==='both'){
				w.ilm.reloadest();
				w.ilm.reload();
			}
			else if(/fc/.test(reload)) w.ilm.reloadest();
			else w.ilm.reload();
			return false;
		},
		setGroup: function (d, name) {
			if(d === "" || (/^(jarv|meri)$/.test(d) && this.showgroup !== d)){
				this.showgroup = d;
				this.state.set({showgroup:(d?d:'none')});
				if(!d) return false;
				if(this.fcplaces[this.fcplace].group!==this.showgroup) this.setEstPlace(this.nextPlace());
				if(this.curplaces[this.curplace].group!==this.showgroup) this.setCurPlace(this.nextCurPlace());
				//this.doReload("both");
			}
			return false;
		},
		setOrder: function(input) {
			var o = (Object.prototype.toString.call( input ) === '[object String]') ? input.split(/[,:]/) : input, p = this.chartorder;
			if (Object.prototype.toString.call( o ) !== '[object Array]') return false;
			if(o.join(":") === p.join(":")) return false;
			this.chartorder = o;
			this.state.set({chartorder : this.chartorder});
			this.reorder();
			return false;
		},
		setBinded: function(value) {
			if(/(0|false)/.test(value)) value = false;
			if(/(1|true)/.test(value)) value = true;
			if(typeof value === 'boolean' && this.binded!==value) {
				this.binded = value;
				this.state.set({binded : this.binded});
			}
			return false;
		},
		setLinksAsMenu: function(value) {
			if(/(0|false)/.test(value)) value = false;
			if(/(1|true)/.test(value)) value = true;
			if(typeof value === 'boolean' && this.linksasmenu!==value) {
				this.linksasmenu = value;
				this.state.set({linksasmenu : this.linksasmenu});
			}
			return false;
		},
		setDate: function(d,load) {
			load=load||'ja';
			var ret = 0,cur = this.getTime();
			if(d && /^\d*-\d*-\d*/.test(d)) {
				d = d.split(/[\sT]/)[0]+" 23:59:59";
				ret = this.getTime(d);
			} else if(d && /^\d+$/.test(d)) {
				ret = this.getTime() - (Number(d)*1000);
			} else if (d && /^\d*h/.test(d)) {
				ret = this.getTime() - (Number(d.replace(/h*$/,""))*3600*1000);
			} else if (d && /^\d*d/.test(d)) {
				ret = this.getTime() - (Number(d.replace(/d*$/,""))*24*3600*1000);
			}
			if(!d || (ret && ret > cur)){
				ret = cur;
			}
			if (ret) {
				this.historyactive=(cur-(3600*1000)>ret) ? true : false;
				this.start = this.date = ret;
				if(load==='ja') this.doReload("curplace");
			}
		},
		isDst: function(){
			var utc = new Date();
			var utcsec = utc.getTime();
	                var dls = new Date(utc.getFullYear(), 3, 0);
                        var dle = new Date(utc.getFullYear(), 10, 0);
                        dls.setDate(dls.getDate()-dls.getDay());
                        dle.setDate(dle.getDate()-dle.getDay());
			//console.log("isDst: " + dls.getTime() + "  " + utcsec + "  " + dle.getTime());
                        if(utcsec < dle.getTime() && utcsec>=dls.getTime()) return true;
                        else return false;
		},
		getOffsetSec: function(offset){
			if(this.addDst===undefined) this.addDst = this.isDst();
			return ((offset||this.timezone)+(this.addDst?1:0))*3600000;
		},
		getTime: function(d,offset) {
			d = this.getGmtTime(d);
                        return  new Date(d.getTime() + this.getOffsetSec(offset));
		},
		getGmtTime: function(d){
                        d = d ? new Date(d) : new Date();
                        return new Date(d.getTime()+(d.getTimezoneOffset()*60000));
		},
		getTimeStr: function (d, f, g) {
			d = d ? new Date(d) : this.getTime();
			var month = d.getMonth();
			if(!/\d/.test(month)) return ret;
			var ret ='', dsep = "." + (month < 9 ? "0" : "") + (month+1) + ".";
			if (f) { dsep = ". " + my.months[month].toLowerCase() + " "; }
			ret = (d.getDate() < 9 ? "0" : "") + d.getDate() + dsep + d.getFullYear();
			if(!g) ret += " " + (d.getHours()<10?"0":"") + d.getHours() + ":" +  (d.getMinutes()<10?"0":"") + d.getMinutes();
			return ret;
		},
		viitedTemplate: function(div){
			var html = '', z = '';
			if(div){
				if( Object.prototype.toString.call( div ) === '[object String]' ) {
					div = $(div);
				}
				div.html(html);
			}
			return html;
		},
		settingTemplate: function(div){
			var html = '', z = '';
			if(my.state.attr) {
				z = my.getFrame();
				html += '<form class="setting-form" style="width:320px;"><div><label for="timeframe">Ajaraam</label> <select class="form-control input-sm" onchange="ilm.setFrame(this.options[this.selectedIndex].value);ilm.reload();return true;" id="timeframe" name="timeframe">' +
					'<option value="12h"' + (z==='12h' ? ' selected' : '') + '>12 tundi</option><option value="1d"' + (z==='1d' ? ' selected' : '') + '>1 päev</option><option value="2d"'+(z==='2d'?' selected':'')+'>2 päeva</option><option value="3d"'+(z==='3d'?' selected':'')+'>3 päeva</option>' +
					'</select></div>';
				html += '<div><label for="history">Andmed</label> <select class="form-control input-sm" onchange="ilm.setCurPlace(this.options[this.selectedIndex].value);ilm.settingTemplate(\'#ilm-seaded-dropdown\');return false;" id="history-sel" name="history-sel">';
				html += _.map(my.curplaces,function(a){if(!my.showgroup||my.curplaces[a.id].group===my.showgroup) {return '<option value="'+a.id+'" '+(a.id===my.curplace?' selected':'')+'>'+a.name+'</option>';}}).join("");
				html += '</select></div>';
				html += '<div><label for="forecast">Ennustus</label> <select class="form-control input-sm" onchange="ilm.setEstPlace(this.options[this.selectedIndex].value);ilm.settingTemplate(\'#ilm-seaded-dropdown\');return false;" id="forecast-sel" name="forecast-sel">';
				html += _.map(my.fcplaces,function(a){if(!my.showgroup||my.fcplaces[a.id].group===my.showgroup) {return '<option value="'+a.id+'" '+(a.id===my.fcplace?' selected':'')+'>'+a.name+'</option>';}}).join("");
				html += '</select></div>';
				html += '<div><label for="groups">Ennustuse ja andmete seos</label> <select class="form-control input-sm" onchange="ilm.setBinded(this.options[this.selectedIndex].value);return false;" id="binding-sel" name="binding-sel">';
				html += _.map({ei:{id:false,name:"Ei ole seotud"},jah:{id:true,name:"On seotud"}},function(a){return '<option value="'+a.id+'" '+(a.id===my.binded?' selected':'')+'>'+a.name+'</option>';}).join("");
				html += '</select></div>';
				html += '<div><label for="groups">Paikade grupid</label> <select class="form-control input-sm" onchange="ilm.setGroup(this.options[this.selectedIndex].value);ilm.settingTemplate(\'#ilm-seaded-dropdown\');return false;" id="groups-sel" name="groups-sel">';
				html += _.map({none:{id:"",name:"--"},jarv:{id:"jarv",name:"Järved"},meri:{id:"meri",name:"Meri"}},function(a){return '<option value="'+a.id+'" '+(a.id===my.showgroup?' selected':'')+'>'+a.name+'</option>';}).join("");
				html += '</select></div>';
				html += '<div><label for="groups">Paigutus</label><div><div style="padding-bottom:3px;"><ul id="order-sel1" class="order itemlist drag-box">';
				html += _.map(my.chartorder,function(a,i){return '<li class="drag-item"name="'+a+'">'+ my.graph_name(a)+'</li>';}).join("");
				html += '</ul></div><div><ul id="order-sel2" class="order itemlist drag-box">';
				html += _.map(my.graphs,function(a,i){return (my.chartorder.indexOf(a)<0) ? '<li class="drag-item" name="'+a+'">'+my.graph_name(a)+'</li>' : "";}).join("");
				html += '</ul></div><div class="checkbox"><label>Näita viiteid menüüs <input type="checkbox" onclick="ilm.setLinksAsMenu(this.checked);return true;" id="linksasmenu" name="linksasmenu"></label></div>';
				html += '</form>';
			}
			if(div){
				if( Object.prototype.toString.call( div ) === '[object String]' ) {
					div = $(div);
				}
				div.html(html);
				var swp = $(".itemlist");
				if(swp.sortable) {
					swp.each(function(i,a){focusEvent(a);});
					$(".itemlist").sortable({connectWith:".itemlist",stop: function(event,ui){
						var nl = $( "#order-sel1" ).sortable( "toArray", {attribute:"name"});
						if(nl.join(":")!==w.ilm.chartorder.join(":")){
							//console.log(nl);
							w.ilm.setOrder(nl);
						}
					}}).disableSelection();
				}
				if(w.ilm.linksasmenu) $("#linksasmenu").attr({"checked":"checked"});
			}
			return html;
		}
	};
	function touchHandler(event) {
		var touch = event.changedTouches[0];
		var simulatedEvent = document.createEvent("MouseEvent");
		simulatedEvent.initMouseEvent({
			touchstart: "mousedown",
			touchmove: "mousemove",
			touchend: "mouseup"
		}[event.type], true, true, window, 1,
			touch.screenX, touch.screenY,
			touch.clientX, touch.clientY, false,
			false, false, false, 0, null);	
		touch.target.dispatchEvent(simulatedEvent);
		event.preventDefault();
	}
	function focusEvent(div){
		div.addEventListener("touchstart", touchHandler, true);
		div.addEventListener("touchmove", touchHandler, true);
		div.addEventListener("touchend", touchHandler, true);
		div.addEventListener("touchcancel", touchHandler, true);
	}
	
	if (w.ilm === undefined) {
		my = new App();
	} else {
		my = w.ilm;
	}
	//my.setDate("2014-04-25T00:00:00");
	//my.setFrame('3d');
	//console.log(my.getTimeStr(my.date) + " " + my.timeframe);
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
			var c,e,f,g,h=/^ut/.test(my.curplace);
			var reg= new RegExp(h?",\\s*":"\\s+?");
			$.each(data.split("\n"),function(a, b) {
				if (b && !/^(--|Aeg)/.test(b)) {
					//b = b.replace(/,\s*/,"\t");
					c = b.split(reg);
					c[9] = (!c[9] || c[9] < 0) ? 0 : c[9];
					//console.log(c[0]+" "+ c[1]);
					if((h && /5:00$/.test(c[0])) || (!h && /5$/.test(c[1]))){
						e=c;
						//console.log("viiega:"+c[1]); //
					} else {
						if(h) my.lastdate = d = new Date(c[0].replace(/(\d\d\d\d)-?(\d\d)-?(\d\d)/,"$1/$2/$3")).getTime();
						else my.lastdate = d = new Date(c[0].replace(/(\d\d\d\d)(\d\d)(\d\d)/,"$1/$2/$3")+" "+c[1]).getTime();
						g = my.start-my.lastdate;
						if(my.timeframe && g > 0 && g <= my.timeframe) {
							for(var i=0,j=c.length;i<j;++i) {
								c[i]=c[i]||null;
								if(e){e[i]=e[i]||null;}
							}
							//console.log(c);
							if(/(emu|zoig)/.test(my.curplace)){
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
							else if(h){
								//Aeg, 1Temperatuur, 2Niiskus, 3&Otilde;hur&otilde;hk, 4Tuule kiirus, 5Tuule suund, 6Sademed, 7UV indeks, Valgustatus, Kiirgusvoog, Radioaktiivsus
								c[4] = (!c[4] || c[4] < -49) ? null : c[4];
								obj.avg_ws_series.data.push([d, my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4])]);
								//obj.max_ws_series.data.push([d, my.ntof2p((e) ? my.getmax([c[8], e[8]]) : c[8])]);
								obj.avg_wd_series.data.push([d, my.ntof2p((e) ? my.wdavg([c[5], e[5]]) : c[5])]);
								if(c[1]!==null) obj.avg_temp_series.data.push([d,my.ntof2p((e) ? my.getavg([c[1], e[1]]) : c[1])]);
								obj.avg_rain_series.data.push([d, my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6])]);
								obj.avg_humid_series.data.push([d, my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2])]);
								obj.avg_press_series.data.push([d, my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3])]);
							}
							else if(/emhi/.test(my.curplace)){
								c[4] = (!c[4] || c[4] < -49) ? null : c[4];
								obj.avg_ws_series.data.push([d, my.ntof2p((e) ? my.getavg([c[7], e[7]]) : c[7])]);
								obj.max_ws_series.data.push([d, my.ntof2p((e) ? my.getmax([c[8], e[8]]) : c[8])]);
								obj.avg_wd_series.data.push([d, my.ntof2p((e) ? my.wdavg([c[9], e[9]]) : c[9])]);
								if(c[4]!==null) obj.avg_temp_series.data.push([d,my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4])]);
								obj.avg_wtemp_series.data.push([d,my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3])]);
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
		yAxis: [{ //0.temp
			tickInterval: 5,
			labels: {
				formatter: function () {
					return this.value + '°C';
				}
			},
			style: {
				color: "#7cb5ec"
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
			s.avg_ws_series = $.extend(true, {}, d_series, {name: "Keskmine",color:"#7cb5ec", lineWidth: 2});//1
			s.max_ws_series = $.extend(true, {}, d_series, {name: "Max", color: "#910000", lineWidth: 2, dashStyle: 'shortdot'});//2
			s.min_ws_series = $.extend(true, {}, d_series, {name: "Min",color:"#90ed7d", lineWidth: 2});//3
			//winddir
			s.min_wd_series = $.extend(true, {}, d_series, {type: "scatter", name: "Min", color:"#90ed7d", lineWidth: 0});//3
			s.avg_wd_series = $.extend(true, {}, d_series, {name: "Keskmine", color:"#7cb5ec", lineWidth: 2});//1
			s.max_wd_series = $.extend(true, {}, d_series,  {type: "scatter", name: "Max", color:"#434348", lineWidth: 0});//2
			//temp
			s.avg_temp_series = $.extend(true, {}, d_series, {name: "Temperatuur", color: "#7cb5ec", negativeColor: 'red', lineWidth: 2});//1
			s.avg_dp_series = $.extend(true, {}, d_series, {name: "Kastepunkt", color: "#0d233a", lineWidth: 1});
			s.avg_wc_series = $.extend(true, {}, d_series, {name: "Tuuletemp", color: "#8bbc21", lineWidth: 1});
			s.avg_press_series = $.extend(true, {}, d_series, {name: "Õhurõhk", color: '#AA4643', lineWidth: 2, type: 'spline', dashStyle: 'shortdot', yAxis: 1, tooltip: { valueSuffix: ' hPa' }});
			s.avg_humid_series = $.extend(true, {}, d_series, {name: "Õhuniiskus", color: '#C7C8CA', lineWidth: 1, type: 'spline', dashStyle: 'longdash', yAxis: 2, tooltip: { valueSuffix: ' %' }});
			s.avg_rain_series = $.extend(true, {}, d_series, {name: "Sademed", color: '#4572A7', lineWidth: 0, type: 'column', yAxis: 3, tooltip: { valueSuffix: ' mm' }});
			s.avg_wtemp_series = $.extend(true, {}, d_series, {name: "Veetemp", color: "#8d4653", lineWidth: 2});
			s.avg_wl_series = $.extend(true, {}, d_series, {name: "Veetase", color: "#8085e9", negativeColor: '#e4d354', lineWidth: 2, type: 'spline', yAxis: 4, tooltip: { valueSuffix: ' cm' }});

			normalizeData(json, s);
			
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
			$("#curplace").html('Andmed <b>'+my.curplaces[my.curplace].name+'</b>').show();
			$("#curtime").html(my.getTimeStr(d,1,my.historyactive?1:0)).show();
			var list = _.map(my.curplaces,function(a){if(!my.showgroup||my.curplaces[a.id].group===my.showgroup) {
				return '<li><a href="#" name="'+a.id+'" class="curplace-select'+(a.id===my.curplace?' active':'')+'">'+a.name+'</a></li>';
			}}).join("");
			$("#curmenu").html(list);
			$("#cursel").show();
			$(".curplace-select").on("click",function(){
					w.ilm.setCurPlace($(this).attr('name'));
					//w.ilm.reload();
					//return false;
			});
			
			if (s.avg_ws_series.data.length) {
			options.wind_speed.title.text = 
				" Tuule kiirus"+(!my.historyactive? " [ <b>" + s.avg_ws_series.data[s.avg_ws_series.data.length - 1][1] + "</b> m/s" +
					" (pagid: <b>" + (s.max_ws_series.data[s.max_ws_series.data.length - 1]||["","-"])[1] + "</b> m/s) ]":'');
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
					(!s.avg_humid_series.data.length && s.avg_wtemp_series.data ? " Veetemperatuur"+(!my.historyactive? " [ <b>" + s.avg_wtemp_series.data[s.avg_wtemp_series.data.length - 1][1] + "</b> °C ]":""):"") +
					(!s.avg_humid_series.data.length && s.avg_wl_series.data ? " Veetase"+(!my.historyactive? " [ <b>" + s.avg_wl_series.data[s.avg_wl_series.data.length - 1][1] + "</b> cm ]":""):"");
			} else {
				options.temp.title.text = "Temperatuuri andmed puuduvad";
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
			
			if(my.chartorder.indexOf("wind_speed") >= 0) my.charts[0] = new Highcharts.Chart(options.wind_speed);
			if(my.chartorder.indexOf("wind_dir") >= 0)  my.charts[1] = new Highcharts.Chart(options.wind_dir);
			if(my.chartorder.indexOf("temp") >= 0)  my.charts[2] = new Highcharts.Chart(options.temp);
			var host = /emhi/.test(my.curplace) ? 'ilmateenistus.ee' : 
					/emu/.test(my.curplace) ? 'energia.emu.ee' :
					/^ut/.test(my.curplace) ? 'meteo.physic.ut.ee' :
					/zoig/.test(my.curplace) ? 'ilm.zoig.ee' :
					/mnt/.test(my.curplace) ? 'balticroads.net': '';
			$('#curmeta').html(
				'<a href="http://' + host + my.curplaces[my.curplace].link  +
					'" onclick="window.open(this.href);return false;">'+host.charAt(0).toUpperCase() + host.slice(1)+'</a>, andmed viimati uuendatud: ' + 
					//new Date(my.lastdate).toLocaleString() +
					my.getTimeStr(my.lastdate) +
					', Järgmine uuendus: ' +
					my.getTimeStr(my.lastdate + updateinterval)
			);
			$("#pagelogo").html(my.logo + ' <span style="font-size:70%">' + my.getTimeStr(my.getTime())+"</span>");
    };
    
    var setTxtFileName = function (d) {
    	d = new Date(d);
		var daystr = d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1) + "-" + (d.getDate() < 10 ? "0" : "") + d.getDate();
		return "ARC-"+daystr+'.txt';
    };
    var setEmuFileName = function (d) {
		return "emu_data/"+setTxtFileName(d);
    };
    var setUtFileName = function (d,place) {
    	place=place.replace(/ut_/,'');
		return "ut_data/"+place+"/"+setTxtFileName(d);
    };
    var setZoigFileName = function (d,place) {
    	place=place.replace(/zoig_/,'');
		return "zoig_data/"+place+"/"+setTxtFileName(d);
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
		now = d = (my.date > 0) ? new Date(my.date).getTime() : my.getTime();
		//url = url || my.dataurl + '&hours=7&res=10m&wind_speed=1&dewpoint=1&outdoor_temperature=1&windchill=1&wind_direction=1&absolute_pressure=1';
		//fake data...
		//ajaxopt.delta="2y";
		var json_full="";
		var cb = function(d) {
			//console.log("Loading data at " + (new Date(d)));
			if(/emu/.test(my.curplace)) {
				ajaxopt={};
				my.dataurl = setEmuFileName(d);
			}
			else if(/^ut/.test(my.curplace)) {
				ajaxopt={};
				my.dataurl = setUtFileName(d, my.curplace);
			}
			else if(/zoig/.test(my.curplace)) {
				ajaxopt={};
				my.dataurl = setZoigFileName(d, my.curplace);
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
				if(/(emhi|emu|mnt|zoig|ut_)/.test(my.curplace) && x) {
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
				//d = my.getTime(wgd.getTime()+1800000),
				d = (wgd.getTime()) + my.getOffsetSec() + 1800000,
				t = 0, i = 0, j = wg.hours.length;
				//console.log("wg time " + wgd + " " + my.addDst);
				/*
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
				*/
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
					'Prognoos <b>'+my.fcplaces[my.fcplace].name+'</b> ' + my.getTimeStr(new Date(wg.update_last.replace(/\+.+/,"")).getTime()+my.getOffsetSec(),1)
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
						my.getTimeStr(new Date(wg.update_last.replace(/\+.+/,"")).getTime()+my.getOffsetSec()) +
						', Järgmine uuendus: ' + 
						my.getTimeStr(new Date(wg.update_next.replace(/\+.+/,"")).getTime()+my.getOffsetSec())
				);
				$("#pagelogo").html(my.logo + ' <span style="font-size:70%">' + my.getTimeStr(my.getTime())+"</span>");
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
	w.openNew = w.openNew || function(url) {
		w.open(url,'_new');
		return false;
	};
	my.lingid = my.lingid || {
		JSON: {
			'list': [ 
				{'name':'Ilmalingid',
				'list': [ 
				{ 'name': 'EMHI','url':'http://www.ilmateenistus.ee/','list': [
				{'href':'ilm/ilmavaatlused/vaatlusandmed/?filter%5BmapLayer%5D=wind','title':"Ilmavaatlused - tuul",'id':'emhi_kaart'},
				{'href':'ilm/prognoosid/mudelprognoosid/eesti/#layers/tuul10ms,tuul10mb','title':"Prognoos - Suur Hirlam",'id':'emhi_hirlam_suur'}
				]},
				{'name': "WeatherOnline",'url':'http://www.weatheronline.co.uk/','list': [
				{'href':'marine/weather?LEVEL=3&LANG=en&MENU=0&TIME=18&MN=gfs&WIND=g005','title':"Soome Laht",'id':'weatheronline_sl'},
				]},
				{'name': "WindGuru",'url':'http://www.windguru.cz/','list': [
				{'href':'int/?go=1&amp;lang=ee&amp;wj=msd&amp;tj=c&amp;odh=3&amp;doh=22&amp;fhours=180&amp;vp=1&amp;pi=2&amp;pu=413733','title':"Eesti Meri",'id':'windguru_meri'},
				{'href':'int/?go=1&amp;lang=ee&amp;wj=msd&amp;tj=c&amp;odh=3&amp;doh=22&amp;fhours=180&amp;vp=1&amp;pi=1&amp;pu=413733','title':"Sisej&auml;rved",'id':'windguru_jarved'},
				{'href':'int/?go=1&amp;lang=ee&amp;sc=266923&amp;wj=msd&amp;tj=c&amp;odh=3&amp;doh=22&amp;fhours=180','title':"Saadj&auml;rv",'id':'windguru_saadjarv'},
				{'href':'int/?go=1&amp;lang=ee&amp;sc=192609&amp;wj=msd&amp;tj=c&amp;odh=3&amp;doh=22&amp;fhours=180','title':"V&otilde;rtsj&auml;rv",'id':'windguru_vortsjarv'},
				{'href':'int/?go=1&amp;lang=ee&amp;sc=365700&amp;wj=msd&amp;tj=c&amp;odh=3&amp;doh=22&amp;fhours=180','title':"Tartu",'id':'windguru_tartu'}
				]},
				{'name': "YR.no",'url':'http://www.yr.no/place/Estonia/','list': [
				{'href':'Tartumaa/Tartu/hour_by_hour.html','title':"Tartu",'id':'yr_tartu'},
				{'href':'Tartumaa/Tamme/hour_by_hour.html','title':"Võrtsjärv Tamme",'id':'yr_tamme'},
				{'href':'Jõgevamaa/Tabivere~793956/hour_by_hour.html','title':"Saadjärv",'id':'yr_tabivere'},
				{'href':'Harjumaa/Tallinn/hour_by_hour.html','title':"Tallinn",'id':'yr_tallinn'},
				{'href':'Pärnumaa/Pärnu/hour_by_hour.html','title':"Pärnu",'id':'yr_parnu'},
				{'href':'Pärnumaa/Häädemeeste/hour_by_hour.html','title':"Häädemeeste",'id':'yr_parnu'}
				]},
				{'name': 'GisMeteo.ru','url':'http://www.gismeteo.ru/towns/','list': [
				{'href':'26231.htm','title':"P&auml;rnu",'id':'gismeteo_parnu'},
				{'href':'26038.htm','title':"Tallinn",'id':'gismeteo_tallinn'},
				{'href':'26242.htm','title':"Tartu",'id':'gismeteo_tartu'}
				]},
				{'name': 'Meteo.pl','url':'http://new.meteo.pl/um/php/meteorogram_map_um.php?lang=en&ntype=0u','list': [
				{'href':'&row=227&col=325','title':"Saadj&auml;rv",'id':'meteopl_saadjarv'},
				{'href':'&row=234&col=318','title':"Võrtsj&auml;rv",'id':'meteopl_vortsjarv'},
				{'href':'&row=234&col=339','title':"Peipsi Räpina",'id':'meteopl_rapina'},
				{'href':'&row=199&col=297','title':"Tallinn",'id':'meteopl_pirita'},
				{'href':'&row=234&col=297','title':"Pärnu",'id':'meteopl_parnu'},
				{'href':'&row=241&col=297','title':"Häädemeeste",'id':'meteopl_haademeeste'}
				]},
				{'name': 'Windfinder.com','url':'http://www.windfinder.com/forecast/','list': [
				{'href':'aeksi_saadjaerv','title':"Saadj&auml;rv",'id':'windfinder_saadjarv'},
				{'href':'tartu_airport','title':"Tartu",'id':'windfinder_tartu'},
				{'href':'mustvee_peipus&wf_cmp=2','title':"Mustvee Peipsi",'id':'windfinder_mustvee'}
				]},
				{'name': 'Muud','url':'http://','list':[
				{'href':'d.naerata.eu/','title':"Naerata.eu",'id':'naerata'},
				{'href':'teeinfo.evenet.ee/?mapdatatype=9','title':"Teeinfo",'id':'teeinfo'},
				{'href':'surf.paper.ee/','title':"Surf.Paper.EE",'id':'paper'},
				{'href':'palts.com/a/et_EE/ilmajaam/','title':"Palts.COM",'id':'palts'},
				{'href':'ilm.zoig.ee/','title':"Zoig.EE",'id':'zoig','app':'?k=516'},
				{'href':'http://www.kalastusinfo.ee/sisu/ilm/ilm-peipsi-jarvel.php','title':"Peipsi Ilmajaamad",'id':'kalastusinfo'},
				{'href':'www.wunderground.com/global/stations/26242.html','title':"WUnderground Tartu",'id':'wground'},
				{'href':'http://www.timeanddate.com/worldclock/astronomy.html?n=242','title':"Päikesetõus/loojang",'id':'sunclock'}
				]},
				]},
				{'name':'Surfilingid',
				'list':[
				{'name':'Eesti','url':'http://','list': [ 
				{'href':'www.surf.ee/chat/','title':"Surf.ee chat",'id':'surfichat'},
				{'href':'http://www.lesurf.ee/index.php?ID=33','title':"Surfiturg",'id':'surfiturg'},
				{'href':'www.lesurf.ee/','title':"L&otilde;una surfarid",'id':'lesurf'},
				{'href':'www.purjelaualiit.ee/','title':"Eesti Purjelaualiit",'id':'purjelaualiit'},
				{'href':'www.gps-speedsurfing.com/','title':"GPS Speedsurfing",'id':'gps-speedsurfing'}
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
    my = w.ilm,
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
		var t = this, f = $("#lingid"), g = $("#sl");
		g.html("Seaded (klikk varjamiseks)");				
		my.settingTemplate(f);
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
		var b = $("#bghide"), hh = $('.navbar').height(), y = w.innerHeight || e.clientHeight || g.clientHeight,
		act = v.attr("name"),swp = 0;
		if (act) $("#ilm-" + act).parent().removeClass("active");
		if(name && (!act || (act && act !== name))) {
			b.css({height : $(d).height(), position : 'absolute', left : 0, top : 0}).show();
			v.attr("name", name);
			$("#ilm-" + name).parent().addClass("active");
			if(cb) cb.call(this, name);
			swp = ((y/2) - (v.height()/2)) + $(w).scrollTop();
			v.css({top : (swp > 0 ? swp : hh)}).show();
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
		$("#ilm-viited").click(function(e){
			//ilm.showLinks();
			var b = $(e.target);
			if(w.ilm.linksasmenu) {
				b.attr({"data-toggle":"dropdown"});
				b.addClass("dropdown-toggle");
				var a = $(".ilm-viited-dropdown");
				a.html(w.ilm.lingid.process(w.ilm.lingid.JSON));
				a.height(w.innerHeight-(w.innerHeight/3));
			} else {
				b.removeClass("dropdown-toggle");
				b.removeAttr("data-toggle");
				w.ilm.Popup("viited",w.ilm.Lingid);
			}
			//return false;
		});
		$("#ilm-seaded").click(function(e){
			my.settingTemplate("#ilm-seaded-dropdown");
			//w.ilm.Popup("seaded",w.ilm.Options);
			//return false;
		});
		$("#fctitle").on("click",function(){
			w.ilm.setEstPlace(w.ilm.nextPlace());
			//w.ilm.reloadest();
			return false;
		});
		$("#datepicker").datepicker({
			dateFormat: 'yy-mm-dd',
			timezone: "+0"+(((my.addDst)?1:0)+2)+"00", 
			onSelect: function(dateText, inst) {
				w.ilm.setDate(dateText);
				//w.ilm.reload();
			}
		});
		$("#curtime").on("click",function(){
			$("#datepicker").datepicker('show');
		});
		$("#curplace").on("click",function(){
			w.ilm.setCurPlace(w.ilm.nextCurPlace());
			//w.ilm.reload();
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
		$(w).on('hashchange', function() {
				console.log("hash changed " + w.location.hash);
				w.ilm.hash_data();
		});
	});
})(window);
