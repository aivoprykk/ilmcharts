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
