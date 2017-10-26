var ilm = (function (my) {
	var w = window, doc = document, loc = w.location;
	function State(opt) {
		opt = opt || {};
		var defaults = {
			id : 'ilmchartsstore01',
			datamode : opt.datamode||'emu',
			timeframe :  opt.timeframe||24*3600*1000,
			fcsources : opt.fcsources || ["wg","yr","em"],
			fcplace : opt.fcplace||'aksi',
			curplace : opt.curplace||'emu',
			chartorder : opt.chartorder || ["temp","wind_speed","wind_dir"],
			gridorder: opt.gridorder || [],
			showgroup : opt.showgroup || "",
			binded : opt.binded || false,
			linksasmenu : opt.linksasmenu || false,
			timezone: opt.timezone || 2,
			viewmode: opt.viewmode || 'cur',
			samplemode: opt.samplemode || 'table',
			sampletype: opt.sampletype || 'detail',
			fcsource: opt.fcsource || 'wg',
			fcmax: opt.fcmax || 48,
			fcshownight: opt.fcshownight||false
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
		this.fcsources = this.state.attr.fcsources;
		this.fcsources_available = ["yr", "wg", "em"];
		this.fcsource=this.state.attr.fcsource||'wg';
		this.fcmax=this.state.attr.fcmax||48;
		this.fcshownight=this.state.attr.fcshownight||false;
		this.samplemode = this.state.attr.samplemode||'table';
		this.sampletype = this.state.attr.sampletype||'detail';
		this.viewmode = this.state.attr.viewmode||'cur';
		this.fcplace = this.state.attr.fcplace;
		this.timezone = this.state.attr.timezone;
		this.curplace = this.state.attr.curplace;
		this.datamode = this.state.attr.datamode;
		this.timeframe = this.state.attr.timeframe;
		this.showgroup = this.state.attr.showgroup;
		this.binded = this.state.attr.binded;
		this.linksasmenu = this.state.attr.linksasmenu;
		this.chartorder = this.state.attr.chartorder;
		this.fcsourcesdata = {
			"yr":{"name":"Yr","url":"http://www.yr.no","datadir":"yr_data","fc_file":"forecast_hour_by_hour.xml",datatype:'xml'},
			"wg":{"name":"WindGuru","url":"http://www.windguru.cz","datadir":"wg_data","fc_file":"windguru_forecast.json",datatype:'json'},
			"em":{"name":"Ilmateenistus","url":"http://www.ilmateenistus.ee","datadir":"empg_data","fc_file":"empg_forecast.json",datatype:'json'}
		};
		this.histsourcesdata = {
					'emhi': 'ilmateenistus.ee',
					'emu': 'energia.emu.ee',
					'ut': 'meteo.physic.ut.ee',
					'zoig': 'ilm.zoig.ee',
					'arhiiv': 'ilm.majasa.ee',
					'mnt': 'balticroads.net',
					'flydog': 'databuoys.sensornest.com'
		},
		this.fcplaces = {
			"tartu":{id:"tartu",name:'Tartu',wglink:"266923",yrlink:"Tartumaa/Tartu",emlink:'795',group:"koht",bind:"tartu",location:[58.380756, 26.723452]},
			"aksi":{id:"aksi",name:'Saadjärv Äksi',wglink:"266923",yrlink:"Tartumaa/Äksi",emlink:'9748',group:"saadjarv-aksi",bind:"flydog_aksi", location:[58.523056, 26.668889]},
			"uhmardu":{id:"uhmardu",name:"Uhmardu",yrlink:"Jõgevamaa/Uhmardu",emlink:'8629',group:"koht",link:'',bind:"mnt_uhmardu",location:[58.640605, 26.791860]},
			"jogeva":{id:"jogeva",name:"Jõgeva",group:"koht",yrlink:"Jõgevamaa/Jõgeva",emlink:'249',link:'',"bind":"mnt_jogeva",location:[58.764849, 26.404618]},
			"tamme":{id:"tamme",name:'Võrtsjärv Tamme',"wglink":192609,yrlink:"Tartumaa/Tamme",emlink:'8094',group:"vortsjarv-tamme",bind:"arhiiv_vortsjarv_tamme", location:[58.271306, 26.134923]},
			"joesuu":{id:"joesuu",name:'Võrtsjärv Jõesuu',"wglink":692681,yrlink:"Viljandimaa/Jõesuu",emlink:'8864',group:"vortsjarv-joesuu",bind:"arhiiv_vortsjarv_joesuu", location:[58.386441, 26.131942]},
			"rapina":{id:"rapina",name:'Peipsi Räpina',"wglink":183648,yrlink:"Põlvamaa/Võõpsu",emlink:'7216',group:"peipsi",bind:"mnt_rapina",location:[58.124988, 27.530086]},
			"mustvee":{id:"mustvee",name:'Peipsi Mustvee',"wglink":20401,yrlink:"Jõgevamaa/Mustvee",emlink:'485',group:"peipsi",bind:"emhi_mustvee",location:[58.847500, 26.951111]},
			"pirita":{id:"pirita",name:'Tallinn Pirita',"wglink":125320,yrlink:"Harjumaa/Pirita~798565",emlink:'596',group:"meri",bind:"emhi_pirita",location:[59.471562, 24.825608]},
			"rohuneeme":{id:"rohuneeme",name:'Tallinn Püünsi',"wglink":70524,yrlink:"Harjumaa/Rohuneeme",emlink:'7039',group:"meri",bind:"emhi_rohuneeme",location:[59.551945, 24.794094]},
			"topu":{id:"topu",name:'Topu',"wglink":18713,yrlink:"Läänemaa/Topu",emlink:'7036',group:"meri",bind:"emhi_topu",location:[58.847182, 23.498752]},
			"parnu":{id:"parnu",name:'Pärnu',"wglink":92781,yrlink:"Pärnumaa/Pärnu",emlink:'625',group:"meri",bind:"emhi_parnu",location:[58.365958, 24.526257]},
			"haademeeste":{id:"haademeeste",name:'Häädemeeste',"wglink":246420,yrlink:"Pärnumaa/Häädemeeste",emlink:'1957',group:"meri",bind:"emhi_haademeeste", location:[58.071644, 24.478816]},
			"sorve":{id:"sorve",name:'Saaremaa Sõrve',"wglink":108163,yrlink:"Saaremaa/Sõrve_Tuletorn",emlink:'7950',group:"meri",bind:"emhi_sorve",location:[57.909984, 22.055313]},
			"ristna":{id:"ristna",name:'Hiiumaa Ristna',"wglink":96592,yrlink:"Hiiumaa/Ristna",emlink:'2561',group:"meri",bind:"emhi_ristna",location:[58.927304, 22.041023]},
		};
		this.curplaces = {
			"flydog_aksi":{id:"flydog_aksi",name:"Saadjärv Äksi",cid:"",group:"saadjarv-aksi",link:'/saadjarve/',bind:"aksi",location:[58.523056, 26.668889]},
			"emu":{id:"emu",name:"Tartu EMU",cid:"",group:"tartu",link:'/weather',bind:"tartu",location:[58.388575, 26.694013]},
			"ut_tartu":{id:"ut_tartu",cid:"",name:"Tartu UT",group:"koht",link:'',bind:"tartu",location:[58.365945, 26.690791]},
			"arhiiv_vortsjarv_tamme":{id:"arhiiv_vortsjarv_tamme",cid:"",name:"Võrtsjärv Tamme",group:"vortsjarv-tamme",link:'',bind:"tamme", location:[58.271306, 26.134923]},
			"arhiiv_vortsjarv_joesuu":{id:"arhiiv_vortsjarv_joesuu",cid:"",name:"Võrtsjärv Jõesuu",group:"vortsjarv-joesuu",link:'',bind:"joesuu", location:[58.386441, 26.131942]},
			/*"mnt_tartu":{id:"mnt_tartu",cid:"",name:"Tartu MNT",group:"jarv",link:'',bind:'',location:[58.380756, 26.723452]},*/
			"mnt_tamme":{id:"mnt_tamme",cid:"",name:"V-Rakke MNT",group:"vortsjarv",link:'',bind:'tamme',location:[58.331664, 26.187807]},
			"mnt_rapina":{id:"mnt_rapina",cid:"",name:"Räpina MNT",group:"peipsi",link:'',bind:"rapina",location:[58.124988, 27.530086]},
			"mnt_uhmardu":{id:"mnt_uhmardu",cid:"",name:"Uhmardu MNT",group:"koht",link:'',bind:"uhmardu",location:[58.640605, 26.791860]},
			"mnt_jogeva":{id:"mnt_jogeva",cid:"",name:"Jõgeva MNT",group:"koht",link:'',bind:"jogeva",location:[58.764849, 26.404618]},
			"emhi_mustvee":{id:"emhi_mustvee",cid:"mustvee",name:"Mustvee EMHI",group:"peipsi",link:'',bind:"mustvee",location:[58.847650, 26.951025]},
			"emhi_pirita":{id:"emhi_pirita",cid:"pirita",name:"Pirita EMHI",group:"meri",link:'/meri/vaatlusandmed/',bind:"pirita",location:[59.471562, 24.825608]},
			"emhi_rohuneeme":{id:"emhi_rohuneeme",cid:"rohuneeme",name:"Püünsi EMHI",group:"meri",link:'/meri/vaatlusandmed/',bind:"rohuneeme",location:[59.551945, 24.794094]},
			"emhi_topu":{id:"emhi_topu",cid:"topu",name:"Haapsalu EMHI",group:"meri",link:'/meri/vaatlusandmed/',bind:"topu",location:[58.943602, 23.509276]},
			"emhi_parnu":{id:"emhi_parnu",cid:"parnu",name:"Pärnu EMHI",group:"meri",link:'/meri/vaatlusandmed/', bind:"parnu",location:[58.365958, 24.526257]},
			"emhi_haademeeste":{id:"emhi_haademeeste",cid:"haademeeste", name:'Häädemeeste EMHI',group:"meri",link:'/meri/vaatlusandmed/',bind:"haademeeste", location:[58.071644, 24.478816]},
			"emhi_sorve":{id:"emhi_sorve",cid:"sorve",name:"Sõrve EMHI",group:"meri",link:'/meri/vaatlusandmed/',bind:"sorve",location:[57.909984, 22.055313]},
			"emhi_ristna":{id:"emhi_ristna",cid:"ristna-2",name:"Ristna EMHI",group:"meri",link:'/meri/vaatlusandmed/',bind:"ristna",location:[58.927304, 22.041023]},
		};
		this.addDst = this.isDst();
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
			series: [],
			responsive: {
				rules: {
					condition: {
						minWidth: 450,
					}
				}
			}
		};
		this.charts = [];
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
		loadBase: function (div,node) {
			var el = null, newel = null, i, j, m=0, co = this.chartorder;
			if(!div) { div = this.placeholder; }
			$(div).children().each(function ( k, l) {
				if (l.className && l.className.match(/float/)) {
					++m;
					for (i = 0, j = l.childNodes.length; i < j; ++i){
						el = l.childNodes[i];
						if(el.classname && /(title|datepicker)/i.test(el.className)) continue;
						if(el.className && el.className.match(/meta/)) {
							break;
						}
						el = null;
					}
					for (i = 0, j = co.length; i < j; ++i) {
						newel = doc.getElementById(co[i]+(node||m));
						if(!newel){
							newel = doc.createElement("div");
							newel.setAttribute("id",co[i] + (node||m));
							newel.className = "movable chart-frame" +((co[i].match(/_dir/))? 2 : 1);
							l.insertBefore(newel,el);
						}
					}
				}
			});
		},
		ready: function(e,fn) {
			if(e.readyState){
				e.onreadystatechange=function(){
					if(e.readyState === "loaded"||e.readyState==="complete"){
						e.onreadystatechange = null;
						if(fn) fn();
					}
				};
			}else{
				e.onload=function(){
					if(fn)fn();
				};
			}
		},
		makeSortable: function(div,fn) {
			var self=w.ilm, swp = $(div);
			if(swp.sortable) {
				swp.each(function(i,a){focusEvent(a);});
				swp.sortable({connectWith:div,stop: function(event,ui){
					var nl = swp.sortable( "toArray", {attribute:"name"});
					if(fn) fn(nl);
					else { 
						if(nl.join(":")!==self.state.attr.gridorder.join(":")){
							self.state.set({gridorder : nl});
						}
					}
				}}).disableSelection();
				swp.sortable('enable');
			}				
		},
		makeUnSortable: function(div) {
			var swp = $(div);
			if(swp.sortable) {
				swp.sortable('disable');
				swp.each(function(i,a){unFocusEvent(a);});
			}			
		},
		map: null,
		markers: {},
		googleMarkerIcon: function(ws){
			ws = ws || 5;
			return {
				path: google.maps.SymbolPath.CIRCLE,
				fillColor: 'white',
				fillOpacity: 0.2,
				scale: Math.pow(2, ws>0?ws:3) / 2,
				strokeColor: 'gray',
				strokeWeight: 0.5
			};
		},
		addGoogleMarker: function(ws,pos,map,title,id){
			var self = this, marker;
			id=id||'none';
			if(self.markers[id]) marker = self.markers[id];
			else {
				marker = new google.maps.Marker({
					position: pos,
					icon: self.googleMarkerIcon(ws),
					title: title||null,
					labelInBackground: false,
				});
				self.markers[id] = marker;
			}
			if(ws && map) {
				marker.setLabel({text: ws+"", color:'black'});
			}
			marker.setMap(map);
		},
		initGoogleMap: function(elid,markers){
			var self = this, keys = null, loc = [], marker, el=document.getElementById(elid);
			var datatable = $('#menu-container .table');
			$(el).css({height:datatable.css('height')});
	        self.map = new google.maps.Map(el, {
	          zoom: 7,
	          center: new google.maps.LatLng(58.824112, 24.834173),
	          mapTypeId: 'terrain',
	          styles: googleMapStyles1
	        });

			if(Object.prototype.toString.call( markers ) === '[object Object]') {
				keys = Object.keys(markers);
			}
	        if(keys) {
		        for (var i = 0; i < keys.length; i++) {
				    var m = markers[keys[i]];
				    self.addGoogleMarker(0, {lat:m.location[0],lng:m.location[1]}, self.map, m.name, keys[i]);
				}
			}
		},
		loadMap: function(e) {
			var self=this, me = e && e.target ? $(e.target) : e ? $(e) : $('.chart-container');
			var templ = '<div class="map-container"><div style="width:100%"><span class="map-info">&nbsp;</span></div><div class="mapbox" id="map"></div></div>';
			if(me) {
				me.html(templ);
				self.initGoogleMap('map',self.curplaces);
			}
			return false;
		},
		loadGrid: function (div) {
			var self=this, el = null, newel = null, i, j, co = 'grid-node-';
			if(!div) { div = this.grid_placeholder || "menu-container"; }
			el = doc.getElementById(div);
			if(el) {
				var html='<tbody>', n='';
				var gridorder = self.state.attr.gridorder;
				var orig_gridorder = Object.keys(this.curplaces);
				if(!gridorder||!gridorder.length||gridorder.length!=orig_gridorder.length) {
					gridorder = orig_gridorder;
					self.state.set({gridorder : gridorder});					
				}
				for(i=0,j=gridorder.length;i<j;++i){
					n=this.curplaces[gridorder[i]];
					html += '<tr id="'+co+n.id+'" name="'+n.id+'" class="data-menu-row" style="background-color:white">';
					html += '<td class="sortable-is-active hide">-</td><td colspan="6">'+n.name+'</td>';
					html += '</tr>';
				}
				html+='</tbody>';
				el.innerHTML = '<div>&nbsp;</div>'+_.template(self.dataTableTemplate,{classes:'table sortable-table',thead:self.gridHeadTemplate,tbody:html});
				self.ready(doc,function(){
					clearInterval(self.gridintval);
					self.fillGridLast(self);
					setInterval(self.fillGridLast,120000,self);//120sec
					$(".data-menu-row").on("click",function(e){
						_.each($('.data-menu-row'),function(a){a.style["background-color"]='white';});
						$(this).css({'background-color':'rgb(236, 236, 236)'});
						self.loadGraph(this,$(this).attr('name'));
					});
					$(".data-menu-order").on("click",function(e){
						if($(this).hasClass('change')) {
							$(this).removeClass('change');
							self.makeSortable(".sortable-table tbody");
							$('.sortable-is-active').each(function(i,a) { $(a).removeClass('hide'); });
						} else {
							$(this).addClass('change');
							self.makeUnSortable(".sortable-table tbody");
							$('.sortable-is-active').each(function(i,a) { $(a).addClass('hide'); });
						}
					});
				});
			}
		},
		loadGraph: function(e, name){
			var self=this, o = '', n=self.curplaces[name]||self.curplaces[self.curplace],changed='',
			m=self.getWidth()<768 ? $('.chart-box') : $('.chartbox'), me = e && e.target ? $(e.target) : e ? $(e) : null,
			func = function(el,n) {
				n=n||{};
				var u=0,xlarge=(self.getWidth()>=1400)?true:false, s = '';
				s += '<div class="chartbox" style="width:100%;height:100%;">';
				s += '<div class="chart-control-box" style="width:100%;position:relative;font-size:80%;">&nbsp;';
				s += '<div style="position:absolute;z-index:10000;left:5px;top:5px;">';
				s += '<span class="title-chart"></span>&nbsp;<span class="change-chart label label-default" name="cur">Ajalugu</span>&nbsp;<span class="change-chart label label-default" name="est">Prognoos</span>';
				s += '</div>';
				s += '<div style="position:absolute;z-index:10000;right:35px;top:5px;">';
				s += '<span class="sample-chart label label-default" name="'+(self.samplemode=='table'?'graph':'table')+'">Näita '+(self.samplemode=='table'?'Graafikut':'Tabelit')+'</span>&nbsp;';
				s += (self.viewmode!=='cur'||xlarge) ? ('<span class="long-chart label label-default" name="'+(self.sampletype=='long'?'detail':'long')+'">Näita '+(self.sampletype=='long'?'Detailset':'Pikaajalist')+'</span>&nbsp;') : '&nbsp;';
				s += '</div>';
				s += '</div>';
				el.html(s);
				var v = self.getWidth(null,el[0]);
				if(self.viewmode=='cur') {
					if(v<400) self.timeframe=4*3600*1000;
					else if(v<500) self.timeframe = 6*3600*1000;
					else if(v<600) self.timeframe = 12*3600*1000;
					else self.timeframe = 24*3600*1000;
				}
				s='<div class="float two-lg"><div class="meta"></div></div>';
				if(xlarge){
					s+='<div class="float two-lg"><div class="meta"></div></div>';
				}
				u=$(el).find('.chartbox');
				u.append(s);				
				self.loadBase(u[0], xlarge?null:self.viewmode==='cur'?1:2);
				if(self.viewmode==='cur'||xlarge) {
					w.ilm.setCurPlace(n.id);
				}
				if(self.viewmode!=='cur'||xlarge) {
					if(n.bind) w.ilm.setEstPlace(n.bind);
				}

				//$('span.title-chart').html(n.name);
				if(!xlarge) {
				$('span.change-chart[name="'+self.viewmode+'"]').addClass('label-primary');
				$('.change-chart').on("click",function(e){
					var a = $(this).attr('name');
					if(a==my.viewmode) return false;
					self.loadGraph(e,a);
				});
				} else {
					$('span.change-chart').css({display:'none'});
				}
				$('.long-chart').on("click",function(e){
					var a = $(this).attr('name');
					if(a==my.sampletype) return false;
					self.loadGraph(e,a);
				});
				$('.sample-chart').on("click",function(e){
					var a = $(this).attr('name');
					if(a==my.samplemode) return false;
					self.loadGraph(e,a);
				});
				return false;
			}, modechanged=false;

			if(/(cur|est)$/.test(name)) {
				self.viewmode = name;
				self.state.set({viewmode : name});
				modechanged = true;
				$('.change-chart').off("click");
				changed='viewmode';
			}
			else if(/(detail|long)$/.test(name)) {
				self.sampletype = name;
				self.state.set({sampletype : name});
				modechanged = true;
				$('.long-chart').off("click");
				changed='sampletype';
			}
			else if(/(graph|table)$/.test(name)) {
				self.samplemode = name;
				self.state.set({samplemode : name});
				modechanged = true;
				changed='samplemode';
				$('.sample-chart').off("click");
			} else {
				o=name;
			}
			if(m.length) {
				if(me && modechanged){//(me.hasClass('change-chart')||me.hasClass('long-chart'))) {
					me = m.prev();
				}
				_.each($('.chart-box'),function(a){a.remove();});
				_.each($('.chartbox'),function(a){a.remove();});
				if(o==self.curplace && !modechanged) {
					_.each($('.data-menu-row'),function(a){a.style["background-color"]='white';});
					self.loadMap();
					return false;
				} else if(!modechanged) {
					self.curplace = o;
				}
			}
			if(me && self.getWidth()<768) {
				var tmp = me;
				while(tmp && tmp.length && !tmp.hasClass('data-menu-row') && !tmp.hasClass('chart-container')){
					tmp = tmp.parent();
				}
				if(tmp && tmp.length) me = tmp;
				if(me.hasClass('data-menu-row')){
					var parent = me.parent(), tr = doc.createElement("tr"),td=doc.createElement("td");
					tr.className = "chart-box";
					tr.appendChild(td);
					td.setAttribute("colspan","6");
					$(tr).insertAfter(me);
					me = $(td);
				}
				return func(me,n);
			}						
			else if(self.getWidth()>=768) {
				return func($('.chart-container'),n);
			}
			return false;
		},
		dataTableTemplate: '<table class="<%=classes%>" style="background-color:white;font-size:80%"><%=thead%><%=tbody%></table>',
		fcHeadTemplate: '<thead><%=inforows%><tr><th>Aeg</th><th>Tuul</th><th>Suund</th><th>Temp</th><th>Sademed</th><th class="hide-edge-xs">Rõhk</th></tr></thead>',
		fcRowTemplate: '<tr class="<%=night?"night hide":""%>"><td><span class="day"><%=day%>&nbsp;</span><%=time%></td><td><span class="ws"<%if(wscolor){%> style="color:<%=wscolor%>"<%}%>><%=ws?ws:""%></span><%if(wg){%>/<span class="wg"<%if(wgcolor){%> style="color:<%=wgcolor%>"<%}%>><%=wg%></span><%}%></td><td><%=wd?wd:""%></td><td><%=temp?temp:""%></td><td><%=rain?rain:""%></td><td class="hide-edge-xs"><%=press?press:""%></td></tr>',
		histHeadTemplate: '<thead><tr><th>Aeg</th><th>Tuul</th><th>Suund</th><th>Temp</th><th>Vesi</th><th class="hide-lg">Veetemp</th><th class="hide-edge-xs">Sademed</th></tr></thead>',
		histRowTemplate: '<tr class="item <%=night?"night":""%>" id="<%=d.time%>"><td><span class="grid-cell-title">Aeg:&nbsp;</span><span class="grid-em"><span class="hide-edge"><span class="day"><%=day%>&nbsp;</span><%=date%>&nbsp;</span><span class="time-str"><%=time%></span></span></td><td><span class="grid-cell-title">Tuul:&nbsp;</span><span class="grid-em"><span class="avg_ws" style="color:<%=wscolor%>"><%=d.avg_ws%></span>/<span class="max_ws" style="color:<%=wgcolor%>"><%=d.max_ws%></span></span></td><td class="avg_wd" title="<%=dn%>"><span class="grid-cell-title">Suund:&nbsp;</span><span class="grid-em"><%=d.avg_wd%></span></td><td class="avg_temp"><span class="grid-cell-title">Temp:&nbsp;</span><span class="grid-em"><%=d.avg_temp%></span></td><td class="avg_wl"><span class="grid-cell-title">Vesi:&nbsp;</span><span class="grid-em"><%=d.avg_wl%></span></td><td class="avg_wtemp hide-lg"><span class="grid-cell-title">Veetemp:&nbsp;</span><span class="grid-em"><%=d.avg_wtemp%></span></td><td class="hide-edge-xs avg_rain"><span class="grid-cell-title">Sademed:&nbsp;</span><span class="grid-em"><%=d.avg_rain%></span></td></tr>',
		gridHeadTemplate: '<thead><tr style="background-color:white"><th><span class="data-menu-order change label label-default" style="position:absolute;display:inline-block;background-color:white;border-radius:5px;color:black">+</span></th><th class="sortable-is-active hide"></th><th>Tuul</th><th>Suund</th><th>Temp</th><th>Vesi</th><th class="hide-lg">Veetemp</th><th class="hide-edge">Sademed</th><th class="hide-edge-xs">Aeg</th></tr></thead>',
		gridRowTemplate: '<td class="sortable-is-active hide">-</td><td><span class="grid-em"><%=first%><span class="hide-edge-xs">&nbsp;<%=last%></span></span></td><td><span class="grid-cell-title">Tuul:&nbsp;</span><span class="trend"><%=d.trend=="u"?"&uarr;":d.trend=="d"?"&darr;":"&nbsp;"%>&nbsp;</span><span class="grid-em" style="color:<%=wscolor%>"><span class="avg_ws"><%=d.avg_ws%></span>/<span class="max_ws" style="color:<%=wgcolor%>"><%=d.max_ws%></span></span></td><td class="avg_wd" title="<%=dn%>"><span class="grid-cell-title">Suund:&nbsp;</span><span class="grid-em"><%=d.avg_wd%></span></td><td class="avg_temp"><span class="grid-cell-title">Temp:&nbsp;</span><span class="grid-em"><%=d.avg_temp%></span></td><td class="avg_wl"><span class="grid-cell-title">Vesi:&nbsp;</span><span class="grid-em"><%=d.avg_wl%></span></td><td class="avg_wtemp hide-lg"><span class="grid-cell-title">Veetemp:&nbsp;</span><span class="grid-em"><%=d.avg_wtemp%></span></td><td class="avg_rain hide-edge"><span class="grid-cell-title">Sademed:&nbsp;</span><span class="grid-em"><%=d.avg_rain%></span></td><td class="time hide-edge-xs"><span class="grid-cell-title">Aeg:&nbsp;</span><span class="grid-em"><span class="hide-edge hide-edge-lg"><span class="day"><%=day%>&nbsp;</span><%=date%>&nbsp;</span><span class="time-str"><%=time%></span></span></td>',
		chartContainerTemplate: '<div class="floa-t col-lg-6 col-md-12 col-xs-12"><div class="title btn-group"><a id="curplace" class="btn btn-default btn-xs navbar-btn">Andmed <b><%=title%></b></a><a id="curtime" class="btn btn-default btn-xs navbar-btn"><%=date%></a><a id="cursel" style="" data-toggle="dropdown" class="btn btn-default btn-xs navbar-btn dropdown-toggle"><span class="caret"></span></a><ul id="curmenu" role="menu" class="curmenu dropdown-menu"><li><a href="#" name="flydog_aksi" class="curplace-select active">Saadjärv Äksi</a></li><li><a href="#" name="emu" class="curplace-select active">Tartu EMU</a></li><li><a href="#" name="ut_tartu" class="curplace-select">Tartu UT</a></li><li><a href="#" name="arhiiv_vortsjarv_joesuu" class="curplace-select">Võrtsjärv Jõesuu</a></li><li><a href="#" name="arhiiv_vortsjarv_tamme" class="curplace-select">Võrtsjärv Tamme</a></li><li><a href="#" name="mnt_tamme" class="curplace-select">V-Rakke MNT</a></li><li><a href="#" name="mnt_rapina" class="curplace-select">Räpina MNT</a></li><li><a href="#" name="mnt_uhmardu" class="curplace-select">Uhmardu MNT</a></li><li><a href="#" name="mnt_jogeva" class="curplace-select">Jõgeva MNT</a></li><li><a href="#" name="emhi_mustvee" class="curplace-select">Mustvee EMHI</a></li><li><a href="#" name="emhi_pirita" class="curplace-select">Pirita EMHI</a></li><li><a href="#" name="emhi_rohuneeme" class="curplace-select">Püünsi EMHI</a></li><li><a href="#" name="emhi_topu" class="curplace-select">Haapsalu EMHI</a></li><li><a href="#" name="emhi_parnu" class="curplace-select">Pärnu EMHI</a></li><li><a href="#" name="emhi_haademeeste" class="curplace-select">Häädemeeste EMHI</a></li><li><a href="#" name="emhi_sorve" class="curplace-select">Sõrve EMHI</a></li><li><a href="#" name="emhi_ristna" class="curplace-select">Ristna EMHI</a></li></ul></div><input id="datepicker" type="text" style="visibility:hidden;height:0;width:0;padding:0;margin:0" class="hasDatepicker"><div class="meta"><div id="curmeta" class="ilm-meta"></div></div></div>',
		chart2Container:        '<div class="floa-t col-lg-6 col-md-12 col-xs-12"><div class="title btn-group"><a id="fctitle" class="btn btn-default btn-xs navbar-btn"><%=title%></a><a id="fcsel" data-toggle="dropdown" class="btn btn-default btn-xs navbar-btn dropdown-toggle"><%=date%><span class="caret"></span></a><ul id="fcmenu" role="menu" class="fcmenu dropdown-menu"></ul></div><div class="meta"><div id="yrmeta" class="ilm-meta"><a href="http://www.yr.no/place/Estonia/Tartumaa/Äksi/hour_by_hour.html" onclick="window.open(this.href);return false;">Yr.no</a> andmed viimati uuendatud: 26.07.2017 22:32, Järgmine uuendus: 27.07.2017 11:00</div><div id="wgmeta" class="ilm-meta"><a href="http://www.windguru.cz/ee/?go=1&amp;sc=266923&amp;wj=msd&amp;tj=c&amp;fhours=180&amp;odh=3&amp;doh=22" onclick="window.open(this.href);return false;">Windguru.cz</a> andmed viimati uuendatud: 27.07.2017 01:24, Järgmine uuendus: 27.07.2017 01:24</div></div></div>',
		gridintval:0,
		getDayLetter: function(date) {
			var day = new Date(date).getDay();
			return this.weekdays[day][0];
		},
		fillGridLast: function (scope,div) {
			var self=scope||this, el = null, newel = null, i, j, co = 'grid-node-', now = new Date();
			if(!div) { div = self.grid_placeholder|| "menu-container"; }
			el = doc.getElementById(div);
			if(el) {
				var func = function(url, n, e) {
					var $e = $(e);
					$.ajax({
						type: "get",
						url: url,
					}).always(function (json,type) {
						if(!/error|timeout/.test(type)){
							var attachMarkerMessage = function (marker, message) {
						        var infowindow = new google.maps.InfoWindow({
						          content: message
						        });
						        var isOpen = function (w){
								    var map = w.getMap();
								    return (map !== null && typeof map !== "undefined");
								};
								if(marker && marker.mclick) google.maps.event.removeListener(marker.mclick);
						        marker.mclick = marker.addListener('click', function() {
						        	if(isOpen(infowindow)) {
						        		infowindow.close();
						        		return false;
						        	}
						         	infowindow.open(marker.get('map'), marker);
						        });
								if(marker && marker.mover) google.maps.event.removeListener(marker.mover);
						        marker.mover = marker.addListener('mouseover', function() {
						         	infowindow.open(marker.get('map'), marker);
						        });
								if(marker && marker.mout) google.maps.event.removeListener(marker.mout);
						        marker.mout = marker.addListener('mouseout', function() {
						         	infowindow.close();
						        });
						    };
							self.normalizeData(n, json, function(obj){
								if(obj) {
									var deferred = false, time = self.getTimeStr(obj.time).split(/\s/),
									idx=n.name.lastIndexOf(" "),first=n.name.substring(0, idx+1), last=n.name.substring(idx + 1,n.name.length);
									if(now.getTime()-obj.time>6*3600000) { deferred = true; }
									if(deferred) $e.addClass("deferred");
									else $e.removeClass("deferred");
									var wsbf=self.bfscale(obj.avg_ws),wgbf=self.bfscale(obj.max_ws);
									$e.html(_.template(self.gridRowTemplate,{
										d:obj,
										first:first,
										last:last,
										day:self.getDayLetter(obj.time),
										date:time[0],
										time:time[1],
										dn:self.dirs(obj.avg_wd),
										wscolor:wsbf.label.style.color||'gray',
										wgcolor:wgbf.label.style.color||'gray',
										night: false
									}));
									if(!deferred) {
										var elf = $e.find('.avg_ws');
										elf.attr('title',wsbf.label.text);
										if(self.markers[n.id]) {
											var label = self.markers[n.id].getLabel()||{};
											label.text = obj.avg_ws ? ""+obj.avg_ws:"0";
											label.color = wsbf.label.style.color||'gray';
											label.fontSize = "80%";
											self.markers[n.id].setLabel(label);
										}
		
										elf = $e.find('.max_ws');
										elf.attr('title',wgbf.label.text);
										if(self.markers[n.id]) {
											var icon = self.markers[n.id].getIcon()||{};
											icon.strokeColor = wgbf.label.style.color||'gray';
											self.markers[n.id].setIcon(icon);
											var str = $e.html().replace(/td>/ig,"div>").replace(/<td/ig,"<div");
											//str = '<div>Tuul:'+obj.avg_ws+'/'+obj.max_ws+'</div><div>Suund:'+obj.avg_ws+'/'+obj.max_ws+'</div>';
											attachMarkerMessage(self.markers[n.id],'<div class="infowindow">'+str+'</div>');
										}
										if(obj.avg_temp<10) $e.find('.avg_temp').addClass('chilli');
										setTimeout(function(){$e.find('.time-str').css({color:'gray'});},60000);
									}
								}
							}, 1);
							$("#pagelogo").html(my.logo + ' <span style="font-size:70%">' + my.getTimeStr(my.getTime())+"</span>");
						}
					});
				};
				for(i in self.curplaces){
					var n = self.curplaces[i], url=self.setHistDataUrl(n.id)+'?'+now.getTime();
					func(url, n, '#'+co+n.id);
				}
			}
		},
		colorasbf: function(w,el){
			bf = this.bfscale(w);
			if(el) {
				var elf = $(el);
				elf.css('color',bf.label.style.color);
				elf.attr('title',bf.label.text);
				return false;
			}
			else {
				return {color:bf.label.style.color,title:bf.label.text};
			}
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
		bfscale: function(ws) {
			if(!ws) {
				return {id:1000,color:"#bababa",label:{style:{color:'rgba(146, 147, 148, 1)'}}};
			}
			if(ws<0.3) {
				return {
					id: 0, 
					from: 0,
					to: 0.3,
					color: 'rgba(68, 170, 213, 0.1)',
					label: {text: 'tuulevaikus', style: {color: 'rgba(146, 147, 148, 1)'}}
				};
			}
			if(ws>=0.3 && ws<1.6) {
				return {
					id: 1, 
					from: 0.3,
					to: 1.5,
					color: 'rgba(68, 170, 213, 0.1)',
					label: {text: 'vaikne tuul', style: {color: 'rgba(146, 147, 148, 1)'}}
				};
			}
			if(ws>=1.6 && ws<3.3) { // Light breeze
				return {
					id: 2, 
					from: 1.5,
					to: 3.3,
					color: 'rgba(0, 0, 0, 0)',
					label: {text: 'kerge tuul', style: {color: 'rgba(97, 98, 98, 1)'}}
				};
			}
			if(ws>=3.3 && ws<5.5) { // Gentle breeze
				return {
					id: 3, 
					from: 3.3,
					to: 5.5,
					color: 'rgba(68, 170, 213, 0.1)',
					label: {text: 'nõrk tuul', style: {color: 'rgba(202, 126, 97, 1)'}}
				};
			}
			if(ws>=5.5 && ws<8) { // Moderate breeze
				return {
					id: 4, 
					from: 5.5,
					to: 8,
					color: 'rgba(0, 0, 0, 0)',
					label: {text: 'mõõdukas tuul', style: {color: 'rgba(25, 174, 49, 1)'}}
				};
			}
			if(ws>=8 && ws<11)  { // Fresh breeze
				return {
					id: 5, 
					from: 8,
					to: 11,
					color: 'rgba(68, 170, 213, 0.1)',
					label: {text: 'üsna tugev tuul', style: {color: 'rgba(22, 62, 205, 1)'}}
				};
			}
			if(ws>=11 && ws<14) { // Strong breeze
				return {
					id: 6, 
					from: 11,
					to: 14,
					color: 'rgba(0, 0, 0, 0)',
					label: {text: 'tugev tuul', style: {color: 'rgba(193, 18, 205, 1)'}}
				};
			}
			if(ws>=14 && ws<17.2) { // High wind
				return {
					id: 7, 
					from: 14,
					to: 17.2,
					color: 'rgba(68, 170, 213, 0.1)',
					label: {text: 'vali tuul', style: {color: 'rgba(205, 14, 8, 1)'}}
				};
			}
			if(ws>=17.2 && ws<20.7) { // <21 Fresh gale
				return {
					id: 8, 
					from: 17.2,
					to: 20.7,
					color: 'rgba(0, 0, 0, 0)',
					label: {text: 'tormine tuul', style: {color: 'rgba(159, 16, 84, 1)'}}
				};
			}
			if(ws>=20.7 && ws<24.5) {
				return {
					id: 9, 
					from: 20.7,
					to: 24.5,
					color: 'rgba(0, 0, 0, 0)',
					label: {text: 'torm', style: {color: '#FF9900'}}
				};
			}
			if(ws>=24.5) {
				return {
					id: 10, 
					from: 24.5,
					to: 28.4,
					color: 'rgba(0, 0, 0, 0)',
					label: {text: 'tugev torm', style: {color: '#FF6600'}}
				};
			}
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
		getWidth: function (i, el) {
			i = i || null;
			return (el && el.clientWidth) ? el.clientWidth : (w.innerWidth) ? w.innerWidth :
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
				if(ac < 0) c = 0;
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
		setTxtFileName:function (d) {
			if(d) {
				d = new Date(d);
				var daystr = d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1) + "-" + (d.getDate() < 10 ? "0" : "") + d.getDate();
				return "ARC-"+daystr+'.txt';
			}
			return "last.txt";
		},
		setHistDataUrl: function(place,d){
			var self = this;
			if(/emu/.test(place)) {
				return "emu_data/"+self.setTxtFileName(d);
			}
			else {
				return place.replace(/^(ut|zoig|emhi|mnt|arhiiv|flydog|)_(.*)$/, function(match, dir, name, s) {
					return dir+(dir=="arhiiv"?"":"_data")+"/"+name+"/"+self.setTxtFileName(d);
				});
			}
			place=place.replace(/arhiiv_/,'');
			return "arhiiv/"+place+"/"+this.setTxtFileName(d);
		},
		setCurPlace: function(d, persist, load) {
			this.setPlace(d, 'curplace', persist, load);
			return false;
		},
		setEstPlace: function(d, persist, load) {
			this.setPlace(d, 'fcplace', persist, load);
			return false;
		},
		setFcSource: function(fn) {
			var self=w.ilm, fc = self.fcsources;
			if(fc.indexOf(fn)<0) return false;
			if(fn!=self.fcsource) {
				self.fcsource = fn;
				self.state.set({fcsource : fn});
				w.ilm.reloadest();
			}
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
				if(d==='tartu'||d==='saadjarv') d='aksi';
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
		setFcAsTable: function(value) {
			if(/(0|false)/.test(value)) value = 'graph';
			if(/(1|true)/.test(value)) value = 'table';
			if(this.samplemode!=value) {
				this.samplemode = value;
				this.state.set({samplemode : this.samplemode});
				this.reloadest();
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
				html += '<div class="checkbox"><label>Näita ennustust tabelis <input type="checkbox" onclick="ilm.setFcAsTable(this.checked);return true;" id="samplemode" name="samplemode"></label></div>';
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
				if(w.ilm.samplemode=='table') $("#samplemode").attr({"checked":"checked"});
			}
			return html;
		},
		normalizeData: function (place, data, fn, last, start, reverse) {
			var dataArray = {};
			var b,d,i,j,k,lastdate,prev=null,obj=null;
			if(!fn) return 0;
			if(place && place.id) place = place.id;
			if(data && data.data){
				for(i=last?data.data.length-2:0,j=data.data.length,k=data.data.length-1;i<j;++i) {
					if(i<0) continue;
					b = data.data[i];
					//$.each(data.data, function (a, b) {
						prev = obj;
						obj = my.rowParser(place, b);
						obj.trend = !prev ? '' : prev.ws_avg>obj.ws_avg ? 'd' : prev.ws_avg<obj.ws_avg ? 'u' : 's';
						if(!last||k==i) fn(obj,j,i);
					//});
				}
				if(j) {
					lastdate = parseInt(data.data[j - 1].time_stamp, 10) * 1000;
				}
			} else if (data) {
				var c,e,f,g,h=/^ut/.test(place);
				var reg= new RegExp(h?",\\s*":"\\s+?");
				var rtmp = data.split("\n");
				var rows = _.filter(rtmp,function(a,i){return a && /^(\d\d)/.test(a);});
				for(i=last?rows.length-2:0,j=rows.length,k=rows.length-1;i<j;++i) {
					if(i<0) continue;
					b = rows[i];
					//$.each(rows,function(a, b) {
						if (b && !/^(--|Aeg)/.test(b)) {
							c = b.split(reg);
							c[9] = (!c[9] || c[9] < 0) ? 0 : c[9];
							if(!last && ((h && /5:00$/.test(c[0])) || (!h && /5$/.test(c[1])))){
								e=c;
							} else {
								if(h) lastdate = d = new Date(c[0].replace(/(\d\d\d\d)-?(\d\d)-?(\d\d)/,"$1/$2/$3")).getTime();
								else lastdate = d = new Date(c[0].replace(/(\d\d\d\d)(\d\d)(\d\d)/,"$1/$2/$3")+" "+c[1]).getTime();
								g = start-lastdate;
								if(!start || (my.timeframe && g > 0 && g <= my.timeframe)) {
									prev = obj;
									obj = my.rowParser(place, c, d, e);
									obj.trend = !prev ? '' : prev.avg_ws > obj.avg_ws ? 'd' : prev.avg_ws<obj.avg_ws ? 'u' : prev.max_ws > obj.max_ws ? 'd' : prev.max_ws<obj.max_ws ? 'u' : 's';
									if(!last||k==i) fn(obj,j,i);
								}
							}
						}
					//});
				}
			}
			return lastdate;
		},
		rowToSeries: function(o,obj) {
			if(!o) return;
			for(var p in o) {
				if(p !== "time" && obj[p+"_series"] && obj[p+"_series"].data) {
					obj[p+"_series"].data.push([o.time, o[p]]);
				}
			}
		},
		nightPlots: function(times,loc){
			if(!times) return null;
			var plots = [];
			var x = 0;
			var night = [];
			var d, c;
			while(x>=0) {
				c=new Date(x>0?x:times[0]);
				d = SunCalc.getTimes(c, loc[0], loc[1])||{};
				if(x===0) {
					x=times[0];
					if(x<d.sunrise.getTime()) {
						night[0] = x;
						night[1] = d.sunrise.getTime();
						plots.push({color:'#eee',from:night[0],to:night[1]});
						//night=[];
					}
				}
				else {
					night[1] = d.sunrise.getTime();
					if(night[1]>times[1]) night[1]=times[1];
					if(night[0] && night[1] && night[1] > night[0]) plots.push({color:'#eee',from:night[0],to:night[1]});
					//night=[];
				}
				night[0] = d.sunset.getTime();
				x+=(24*3600*1000);
				if(x>times[1]&&night[1]===times[1]) x=-1;
			}
			return plots;
		},

		rowParser: function(place, c, d, e) {
			var r = {}, my=this;
			if(!c) return r;
			if(c.time_stamp) {
				r.time = parseInt(b.time_stamp, 10) * 1000;
				r.avg_ws = my.ntof2p(b.avg_wind_speed);
				r.max_ws = my.ntof2p(b.max_wind_speed);
				r.avg_wd = my.ntof2p(b.avg_wind_direction);
				r.max_wd = my.ntof2p(b.max_wind_direction);
				r.avg_temp = my.ntof2p(b.avg_outdoor_temperature);
				r.avg_dp = my.ntof2p(b.avg_dewpoint);
				r.avg_wc = my.ntof2p(b.avg_windchill);
				r.avg_rain = my.ntof2p(b.rain_1hour);
				r.avg_humid = my.ntof2p(b.outdoor_humidity);
				r.avg_press = my.ntof2p(b.avg_absolute_pressure);
			} else {
				for(var i=0,j=c.length;i<j;++i) {
					c[i]=c[i]||null;
					if(e){e[i]=e[i]||null;}
				}
				r.time = d || new Date(c[0].replace(/(\d\d\d\d)(\d\d)(\d\d)/,"$1/$2/$3")+" "+c[1]).getTime();
				if(/^ut/.test(place)){
					r.time = d || new Date(c[0].replace(/(\d\d\d\d)-?(\d\d)-?(\d\d)/,"$1/$2/$3")).getTime();
					c[1] = (c[1] && (c[1] <-49||c[1]>49)) ? null : c[1];
					c[4] = (c[4] && (c[4] <0||c[4]>49)) ? null : c[4];
					r.avg_ws = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
					//r["max_ws"] = my.ntof2p((e) ? my.getmax([c[8], e[8]]) : c[8]);
					r.avg_wd = my.ntof2p((e) ? my.wdavg([c[5], e[5]]) : c[5]);
					if(c[1]!==null) r.avg_temp = my.ntof2p((e) ? my.getavg([c[1], e[1]]) : c[1]);
					r.avg_rain = my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6]);
					r.avg_humid = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
					r.avg_press = my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3]);
				}
				else if(/(emu|zoig)/.test(place)){
					r.avg_ws = my.conv_kmh2ms(my.ntof2p((e) ? my.getavg([c[7], e[7]]) : c[7]));
					r.max_ws = my.conv_kmh2ms(my.ntof2p((e) ? my.getmax([c[8], e[8]]) : c[8]));
					r.avg_wd = my.ntof2p((e) ? my.wdavg([c[9], e[9]]) : c[9]);
					r.avg_temp = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
					r.avg_dp = my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6]);
					r.avg_wc = my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3]);
					r.avg_rain = my.ntof2p((e) ? my.getavg([c[10], e[10]]) : c[10]);
					r.avg_humid = my.ntof2p((e) ? my.getavg([c[5], e[5]]) : c[5]);
					r.avg_press = my.ntof2p((e) ? my.getavg([c[11], e[11]]) : c[11]);
				}
				else if(/emhi/.test(place)){
					c[4] = (!c[4] || c[4] < -49) ? null : c[4];
					c[7] = (c[7] && (c[7] <0||c[7]>49)) ? null : c[7];
					if(e) e[7] = (e[7] && (e[7] <0||e[7]>49)) ? null : e[7];
					c[8] = (c[8] && (c[8] <0||c[8]>49)) ? null : c[8];
					if(e) e[8] = (e[8] && (e[8] <0||e[8]>49)) ? null : e[8];
					r.avg_ws = my.ntof2p((e) ? my.getavg([c[7], e[7]]) : c[7]);
					r.max_ws = my.ntof2p((e) ? my.getmax([c[8], e[8]]) : c[8]);
					r.avg_wd = my.ntof2p((e) ? my.wdavg([c[9], e[9]]) : c[9]);
					if(c[4]!==null) r.avg_temp = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
					r.avg_wtemp = my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3]);
					r.avg_wl = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
				}
				else if(/mnt/.test(place)){
					c[2] = (!c[2] || c[2] < -49) ? null : c[2];
					c[8] = (c[8] && (c[8] <0||c[8]>49)) ? null : c[8];
					if(e) e[8] = (e[8] && (e[8] <0||e[8]>49)) ? null : e[8];
					c[6] = (c[6] && (c[6] <0||c[6]>49)) ? null : c[6];
					if(e) e[6] = (e[6] && (e[6] <0||e[6]>49)) ? null : e[6];
					r.avg_ws = my.ntof2p((e) ? my.getavg([c[8], e[8]]) : c[8]);
					r.max_ws = my.ntof2p((e) ? my.getmax([c[6], e[6]]) : c[6]);
					r.avg_wd = my.ntof2p((e) ? my.wdavg([c[7], e[7]]) : c[7]);
					if(c[2]!=="") r.avg_temp = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
					if(c[3]!=="") r.avg_rain = my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3]);
					if(c[4]!=="") r.avg_humid = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
					if(c[5]!=="") r.avg_dp = my.ntof2p((e) ? my.getavg([c[5], e[5]]) : c[5]);
				}
				else if(/(arhiiv|flydog)/.test(place)){
					r.avg_ws = my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6]);
					r.max_ws = my.ntof2p((e) ? my.getmax([c[7], e[7]]) : c[7]);
					r.avg_wd = my.ntof2p((e) ? my.wdavg([c[5], e[5]]) : c[5]);
					if(c[2]!=="") r.avg_temp = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
					if(c[4]!=="") r.avg_dp = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
					if(c[8]!=="") r.avg_humid = my.ntof2p((e) ? my.getavg([c[8], e[8]]) : c[8]);
					if(c[9]!=="") r.avg_press = my.ntof2p((e) ? my.getavg([c[9], e[9]]) : c[9]);
				}
			}
			return r;						
		},
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
	function unFocusEvent(div){
		div.removeEventListener("touchstart", touchHandler, true);
		div.removeEventListener("touchmove", touchHandler, true);
		div.removeEventListener("touchend", touchHandler, true);
		div.removeEventListener("touchcancel", touchHandler, true);
	}

	var googleMapStyles1 = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "administrative.neighborhood",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.province",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "landscape.man_made",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "landscape.natural.landcover",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "landscape.natural.terrain",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.attraction",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.business",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.government",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.medical",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "poi.place_of_worship",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.school",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.sports_complex",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "stylers": [
      {
        "visibility": "simplified"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#dadada"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.local",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "stylers": [
      {
        "visibility": "simplified"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#c9c9c9"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
];


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


$(function() {
  var WindBarbArrowHandler = {
    WindArrow: function(speed, direction, container, arrowWidth) {
      'use strict';
      var index = 0,
        i;

      this.speed = speed;
      this.direction = direction;
      this.trigDirection = direction + 90;
      this.scale = arrowWidth / 8;

      this.ten = 0;
      this.five = 0;
      this.fifty = 0;


      // Create the canvas
      $(container).append(
        $(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
        .attr({
          height: 2 * arrowWidth,
          width: 2 * arrowWidth
        })
      );
      $("svg", container).append(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
      $("defs", container).append($(document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')).attr('id', 'clip'));
      $("clipPath", container).append($(document.createElementNS('http://www.w3.org/2000/svg', 'rect'))
        .attr({
          height: 2 * arrowWidth,
          width: 2 * arrowWidth
        }));

      // Draw the widget area    
      $("svg", container).append($(document.createElementNS('http://www.w3.org/2000/svg', 'g')).attr('class', 'wind-arrow'));

      this.widget = $("svg", container);

      if (this.speed > 0) {
        // Prepare the path
        this.path = "";
        if (this.speed <= 7) {
          // Draw a single line
          this.longBar();
          index = 1;
        } else {
          this.shortBar();
        }

        // Find the number of lines in function of the speed
        this.five = Math.floor(this.speed / 5);
        if (this.speed % 5 >= 3) {
          this.five += 1;
        }

        // Add triangles (5 * 10)
        this.fifty = Math.floor(this.five / 10);
        this.five -= this.fifty * 10;
        // Add tenLines (5 * 2)
        this.ten = Math.floor(this.five / 2);
        this.five -= this.ten * 2;

        // Draw first the triangles
        for (i = 0; i < this.fifty; i++) {
          this.addFifty(index + 2 * i);
        }
        if (this.fifty > 0) {
          index += 2 * (this.fifty - 0.5);
        }

        // Draw the long segments
        for (i = 0; i < this.ten; i++) {
          this.addTen(index + i);
        }
        index += this.ten;

        // Draw the short segments
        for (i = 0; i < this.five; i++) {
          this.addFive(index + i);
        }

        this.path += "Z";

        // Add to the widget

        this.widget.append(document.createElementNS('http://www.w3.org/2000/svg', 'g'));

        $("g", this.widget).append($(document.createElementNS('http://www.w3.org/2000/svg', 'path')).attr({
          'd': this.path,
          'vector-effect': 'non-scaling-stroke',
          'transform': 'translate(' + arrowWidth + ', ' + arrowWidth + ') scale(' + this.scale + ') rotate(' + this.trigDirection + ' ' + 0 + ' ' + 0 + ')  translate(-8, -2)',
          'class': 'wind-arrow'
        }));
      }

    },

    shortBar: function() {
      // Draw an horizontal short bar.
      'use strict';
      this.path += "M1 2 L8 2 ";
    },

    longBar: function() {
      // Draw an horizontal long bar.
      'use strict';
      this.path += "M0 2 L8 2 ";
    },
    addTen: function(index) {
      // Draw an oblique long segment corresponding to 10 kn.
      'use strict';
      this.path += "M" + index + " 0 L" + (index + 1) + " 2 ";
    },
    addFive: function(index) {
      // Draw an oblique short segment corresponding to 10 kn.
      'use strict';
      this.path += "M" + (index + 0.5) + " 1 L" + (index + 1) + " 2 ";
    },
    addFifty: function(index) {
      // Draw a triangle corresponding to 50 kn.
      'use strict';
      this.path += "M" + index + " 0 L" + (index + 1) + " 2 L" + index + " 2 L" + index + " 0 ";
    },

  };
  window.WindBarbArrowHandler = window.WindBarbArrowHandler || WindBarbArrowHandler;
  //WindBarbArrowHandler.WindArrow(30, 45, $("#windBarbArrow"), 40);
});
