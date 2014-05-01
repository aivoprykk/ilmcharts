/**
 * Skriptid.js
 * for ilm.
 * by Aivo Prükk
**/
// ajax functions
ajax={};
function $__(e){if(typeof e=='string')e=document.getElementById(e);return e};
ajax.x=function(){try{return new ActiveXObject('Msxml2.XMLHTTP')}catch(e){try{return new ActiveXObject('Microsoft.XMLHTTP')}catch(e){return new XMLHttpRequest()}}};
ajax.send=function(u,f,m,a,t){var x=ajax.x();x.open(m,u,true);x.onreadystatechange=function(){if(x.readyState==4)f(eval("x.response"+t))};x.send(a)};
ajax.load = function(url,s){var f=function(){ajax.send(url,loadXml,'GET',null,'XML');};f();return setInterval(f,s);};
ajax.clear = function(f){ return clearInterval(f); }

//var swap1=0,swap2=0;
function loadXml(xml){
 var mt=function(ts){
  var d=new Date(ts*1000),h,m;
  return(((h=d.getHours())<10)?"0":"")+h+":"+(((m=d.getMinutes())<10)?"0":"")+m;
 };
 var i=0,l=0;
 var sw=null,a=null,f=null,attr=[];
 var n=xml.nodeName;
 var t=xml.nodeType;
 var v=xml.nodeValue;
 var p=xml.parentNode;
 if(p!=undefined&&p!=null){
  if(t==1){
   attr=['unit','value'];
   for(i in attr){if(sw=xml.getAttribute(attr[i])){ a=n+'_'+attr[i];break;}}
   if(a=='res_value') sw=sw+'inutit';
  }
  else if(t==3&&v&&v!='\n'){
    a=p.nodeName,sw=v;
    attr=['cur','min','max','avg'];
    for(i in attr){if(a==attr[i]){a=p.parentNode.nodeName+'_'+a;break;}}
    if(a=='sunset'||a=='sunrise')sw=mt(v);
  }
  if(sw&&a){f=$__(a);if(f!=null){f.innerHTML=sw;}}
 }
 if(xml.hasChildNodes){
  for(i=0,l=xml.childNodes.length;i<l;i++)loadXml(xml.childNodes[i]);
 }
}

/*
*/
indexOf = function(arr,searchElement /*, fromIndex */){
  if (arr === void 0 || arr === null) throw new TypeError();
  var t = Object(arr);
  var len = t.length >>> 0;
  if (len === 0) return -1;  
  var n = 0;
  if (arguments.length > 1){
   n = Number(arguments[2]);
   if (n !== n) // shortcut for verifying if it's NaN
    n = 0;
   else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
    n = (n > 0 || -1) * Math.floor(Math.abs(n));
  }
  if (n >= len) return -1;
  var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
  for (; k < len; k++){
   if (k in t && t[k] === searchElement) return k;
  }
  return -1;
};

/**
Cookie management
by Matt Doyle
http://www.elated.com/articles/javascript-and-cookies/
*/

var cookie = {
 set: function ( name, value, exp_y, exp_m, exp_d, path, domain, secure ){
  var cookie_string = name + "=" + escape ( value );
  if ( exp_y ) {
    var expires = new Date ( exp_y, exp_m, exp_d );
    cookie_string += "; expires=" + expires.toGMTString();
  }
  if ( path ) cookie_string += "; path=" + escape ( path );
  if ( domain ) cookie_string += "; domain=" + escape ( domain );
  if ( secure ) cookie_string += "; secure";
  document.cookie = cookie_string;
 },
 clear: function ( cookie_name ) {
  var cookie_date = new Date ( );  // current date & time
  cookie_date.setTime ( cookie_date.getTime() - 1 );
  document.cookie = cookie_name += "=; expires=" + cookie_date.toGMTString();
 },
 get: function ( cookie_name ) {
  var results = document.cookie.match ( '(^|;) ?' + cookie_name + '=([^;]*)(;|$)' );
  if ( results ) return ( unescape ( results[2] ) );
  else return null;
 },
 refresh: function (name,value){
  var dt= new Date();
  var m= dt.getMonth();
  var d= dt.getDate();
  d=(d>28)?28:d;
  var y= dt.getFullYear();
  if(cookie.get(name)!=null){ cookie.clear(name); }
  cookie.set(name,value,y+1,m,d);
 }
};

/**
page ui
*/

var data = {
'outdoor_temperature':{'title':"Temperatuur väljas",'abbr':'Temp','gt':'temp','gs':1,'gn':'temp_out'},
'indoor_temperature':{'title':"Temperatuur sees",'abbr':'Temp','gt':'temp','gs':2,'gn':'temp_in'},
'dewpoint':{'title':"Kastepunkt",'gt':'temp','gs':3,'gn':'dewpt'},
'windchill':{'title':"Tuuletemperatuur",'abbr':'Tuuletemp','gt':'temp','gs':4,'gn':'chill'},
'wind_speed':{'title':"Tuule kiirus",'abbr':'Tuul','gt':'wind','gs':1,'gn':'wind'},
'wind_direction':{'title':"Tuule suund",'abbr':'Suund','gt':'wind','gs':2,'gn':'winddir'},
'absolute_pressure':{'title':"Absoluutne õhurõhk",'abbr':'Õhurõhk','gt':'press','gs':1,'gn':'abs_press'},
'relative_pressure':{'title':"Relatiivne õhurõhk",'abbr':'Õhurõhk','gt':'press','gs':2,'gn':'rel_press'},
'outdoor_humidity':{'title':"Õhuniiskus Väljas",'abbr':'Niiskus','gt':'humid','gs':1,'gn':'humid_out'},
'indoor_humidity':{'title':"Õhuniskus sees",'abbr':'Niiskus','gt':'humid','gs':2,'gn':'humid_in'},
'rain_1hour':{'title':"Sademed 1 tund",'abbr':'Sademed 1t','gt':'rain','gs':1,'gn':'rain1h'},
'rain_24hour':{'title':"Sademed 24 tundi",'abbr':'Sademed 24t','gt':'rain','gs':2,'gn':'rain24h'},
'rain_total':{'title':"Sademeid kokku mõõdetud",'abbr':'Sademed kokku','gt':'rain','gs':3,'gn':'rainall'},
};

var sets={
 'def':{'title':'Vaikimisi','gs':['wind_speed','wind_direction','absolute_pressure','outdoor_temperature','rain_1hour'],},
 'mingi':{ 'title':'Mingi','gs':['outdoor_temperature','indoor_temperature','wind_speed','wind_direction',],},
 'mingi2':{ 'title':'Mingi2','gs':['outdoor_temperature','absolute_pressure','indoor_temperature','wind_speed','wind_direction',],},
 'wind':{'title':"Tuul",'gs':['wind_speed','wind_direction']},
 'temp':{'title':"Temperatuur",'gs':['outdoor_temperature','indoor_temperature','dewpoint','windchill']},
 'press':{'title':"Õhurõhk",'gs':['absolute_pressure','relative_pressure']},
 'humid':{'title':"Õhuniiskus",'gs':['outdoor_humidity','indoor_humidity']},
 'rain': {'title':"Sademed",'gs':['rain_1hour','rain_24hour','rain_total']},
 'out':{'title':'Väljas','gs':['wind_speed','wind_direction','outdoor_temperature','outdoor_humidity','absolute_pressure','dewpoint','windchill','rain_1hour','rain_24hour'],},
 'ins':{'title':'Toas','gs':['indoor_temperature','indoor_humidity'],},
};

var ilmakast={
 html: function(f){//f eeldab groups.inout massiivi
  var t=this,s=function(f,v){ return '<span id="'+f+'">'+((v)?v:'')+'</span>';};
  var v='0',sw='',str='',i=0;
  if(f.out){ //välimine(inout) loop
   str="<table>\n"+t.html(f.out)+'<tr><td colspan="2">'+f.ins.title+'</td></tr>'+t.html(f.ins);
   str+='<tr><td>Mõõdetud:</td><td><span id="time_stamp"></span></td></tr>'+"\n"+'<tr><td>Intervall:</td><td><a href="#" onclick="return ilmakast.changeRes();"><span id="res_value"></span></a></td></tr></table>'+"\n"+'<table><tr><td colspan="2">Päike tõuseb:&nbsp;<span id="sunrise"></span></td></tr>'+"\n"+'<tr><td colspan="2">Päike loojub:&nbsp;<span id="sunset"></span></td></tr></table>'+"\n";
  }
  else if(f.gs){ //sisemine(gs) loop
   for(i in f.gs){
    var p=f.gs[i],gt=data[p].gt,tl=(data[p].abbr)?data[p].abbr:data[p].title;
    sw='<b>'+s(p+'_cur')+'&nbsp;'+s(p+'_unit')+'</b>&nbsp;';
    sw+=((p=='absolute_pressure')
     ? s('tendency')
     : '('+s(p+'_avg',v)+'/'+s(p+'_min',v)+'/'+s(p+'_max',v)+')');
    str+='<tr><td><a href="?gt='+gt+'" onclick="return graph.change(\''+gt+'\')">'+tl+'</a></td><td>'+sw+'</td></tr>'+"\n";
   }
  }
  return str;
 }
 ,res: 5
 ,p: ''
 ,changeRes: function(){
  var t=this,rss=new Array(1,2,5,10,30,60);
  var of=indexOf(rss,t.res)+1;
  t.res=((of<(rss.length))?rss[of]:rss[0]);
  var url="gr.php?last=1&res="+t.res+"m";
  if(t.p!='') ajax.clear(t.p);
  t.p=ajax.load(url,10000);
  return false;
 }
};

function openNew(url){window.open(url);return false;}

function sendUrl(path, params, method) {
 method = method || "post";
 var form = document.createElement("form");
 //move the submit function to another variable
 //so that it doesn't get over written
 form._submit_function_ = form.submit;

 form.setAttribute("method", method);
 form.setAttribute("action", path);
 form.setAttribute("target","_blank");

 for(var key in params) {
   var hiddenField = document.createElement("input");
   hiddenField.setAttribute("type", "hidden");
   hiddenField.setAttribute("name", key);
   hiddenField.setAttribute("value", params[key]);
   form.appendChild(hiddenField);
 }
 document.body.appendChild(form);
 form._submit_function_(); //call the renamed function
 document.body.removeChild(form);
}

var lingid={
 JSON: {
 'list': [ 
  {'name':'Ilmalingid',
  'list': [ 
   {'name': 'Ilm.ee','url':'http://www.ilm.ee/','list': [
    {'href':'tartu','title':"Ilmavaatlused - Tartu",'id':'ilmee_tartu'},
   ]},
   { 'name': 'EMHI','url':'http://www.emhi.ee/','list': [
    {'href':'?ide=21&amp;v_kiht=1','title':"Ilmavaatlused - kaart",'id':'emhi_kaart'},
    {'href':'?ide=19,394,423,426','title':"Prognoos - Hirlam",'id':'emhi_hirlam'},
    {'href':'?ide=19,394,416,1203','title':"Prognoos - Suur Hirlam",'id':'emhi_hirlam_suur'},
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
    {'href':'ilm.zoig.ee/','title':"Zoig.EE",'id':'zoig','app':'?k=5163487&amp;p=1022'},
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
 }
 ,process: function(f,u){
  var t=this,s='',i=0,patt=new RegExp("^http");
  u=(u==undefined)?'':u;
  if(f.href!==null && f.href){
   s +='<li>';
   s +='<a href="'
    +((patt.test(f.href)==false)?u:'')+f.href
    +((f.title)?'" title="'+f.title:'')
    +((f.id)?'" id="'+f.id:'')
    +'" onclick="'+'a=\''+((f.app)?f.app:'')+'\';return openNew(this.href+a);">';
   s +=((f.name)?f.name:f.title)+'</a></li>';
  } else if(f.list){
   if(f.name) { 
     s+='<div class="lingid">';
     if(!f.list[0].href) s+='<div class="ok">'
     s+= f.name
     if(!f.list[0].href) s+= '</div>';
   };
   if(f.url){ s+='<ul>'; }
   for(i in f.list) { s+=t.process(f.list[i],f.url); }
   if(f.url){ s+='</ul>'; }
   if(f.name) {
     s+='</div>';
   };
  }
  return s;
 }
 ,show: function(state){
  var t=this,f=$__("lingid"),g=$__("sl");
  var str='';
  if(state!=undefined) linkState=state;
  else linkState=(linkState)?0:1;
  if(linkState==0){ g.innerHTML="Viited"; cookie.clear('linkState'); }
  else { str=t.process(t.JSON); g.innerHTML="Viited (klikk varjamiseks)"; cookie.refresh('linkState',linkState); }
  f.innerHTML=str;
  fade('lingid',(str)?0:100,(str)?100:0,200);
  bHeight();
  return false;
 }
};

function showContent(){
 $__('loading').style.visibility='visible';
 $__('alus').style.visibility='hidden';
 fade('loading',100,0,300);
 fade('alus',0,100,300);
}

function setOpacity(eID, opacityLevel) {
 if(opacityLevel>100) opacityLevel=100;
 if(opacityLevel<1) opacityLevel=1;
 var d=opacityLevel/100;
 var eStyle = $__(eID).style;
 if(opacityLevel==1) eStyle.visibility='hidden';
 if(opacityLevel==100) eStyle.visibility='visible';
 if(browser.name=='Explorer'){
  if(browser.version<8){
   eStyle['filter'] = 'alpha(opacity='+opacityLevel+');';
  } else {
   eStyle['-ms-filter']='progid:DXImageTransform.Microsoft.Alpha(Opacity='+opacityLevel+');';
  }
 }else{
  eStyle.opacity = d;
 }
}
function fade(eID, startOpacity, stopOpacity, duration) {
 var speed = Math.round(duration / 100);
 var timer=0,i=0;
 if (startOpacity < stopOpacity){ // fade in
  for (i=startOpacity; i<=stopOpacity; i++) {
   setTimeout("setOpacity('"+eID+"',"+i+")", timer * speed);
   timer++;
  } return;
 }
 for (i=startOpacity; i>=stopOpacity; i--) { // fade out
  setTimeout("setOpacity('"+eID+"',"+i+")", timer * speed);
  timer++;
 }
}

var graph={
 obj: {}
 ,period: ''
 ,res: ''
 ,height: 140
 ,width: 500
 ,src: 'wind'
 ,state: 0
 ,intrun: null
 ,html: function(f){
  var t=this,s=function(f){
   var i=0,y=0,j=0,str='',p=typeof(f.gs);
   if(p=='object'){ for(i in f.gs){ str+=d(data[f.gs[i]]); }; }
   else { str+=d(f); }
   return str;
  };
  var d=function(f){
   return '<div class="img" style="color:#ffffff">'+f.title+'</div>'+'<div class="img" id="'+f.gt+f.gs+'"></div>';
  };
  var str='',i=0;
  if(f.gs){str+=s(f);}
  else {
   for(i in f){
    str+='<div class="img"><a href="?set='+i+'" onclick="return graph.change(\''+i+'\')" style="font-weight:bold;">'+f[i].title+'</a></div>';
    str+=t.html(f[i]);
   }
  }
  return str;
 }
 ,img: function(j){
  var t=this;
  var o=data[j],h=(t.height)?t.height:'';
  var target=o.gt+o.gs;
  if(o.gt=='wind'&&o.gs=='2'){ h=h/2; }
  var uri='gr.php?gt='+o.gt+'&gs='+o.gs;
  if(t.period) uri+='&'+t.period;
  if(t.res) uri+='&res='+t.res;
  if(t.width) uri+='&w='+t.width;
  if(h) uri+='&h='+h;
  var val=uri+'&timevalue='+(new Date()).getTime();
  //$__(target).style.visibility='hidden';
  if(h) $__(target).style.height=h+'px';
  if(t.width) $__(target).style.width=t.width+'px'; 
  $__(target).innerHTML='<img id="img_'+target+'" src="" '
   //+((t.width)?'width="'+graph.width+'" ':'')
   //+((h)?'height="'+h+'" ':'')
   +'alt="" onclick="graph.img(\''+j+'\');"/>';
  $__('img_'+target).src=val;
  $__('img_'+target).onload=function(){$__(target).style.visibility='visible'; bHeight();}
  fade(target,0,100,1000);
  //setTimeout('bHeight',k+200);
 }
 ,load: function(j){
  var t=this,k=1,i=0;
  if(j==undefined){j=t.src;}
  if(j && sets[j] && sets[j].gs){
   for(i in sets[j].gs){
    setTimeout("graph.img('"+sets[j].gs[i]+"')",k);
    k+=100;
   }
  } else if(j && data[j] && data[j].gs){
   setTimeout("graph.img('"+j+"')",k);
  } else {
   for(i in sets){ t.load(i); }
  }
 }
 ,interval: function(state){
  var t=this,s="Piltide uuendamine",of,rss=new Array("0","1","5","10","20",30,60);
  if(state!=undefined) { of=indexOf(rss,state);}
  else if(t.state==0||t.state==null) of=1;
  else of=indexOf(rss,t.state)+1;
  t.state=((of<(rss.length))?rss[of]:rss[0]);
  if(t.state==0){
   cookie.clear('graph.state');
   if(t.intrun!=''){clearInterval(t.intrun);}
   $__("il").innerHTML=s+"(väljas)";
  } else {
   cookie.refresh('graph.state',t.state);
   if(t.intrun!='') { clearInterval(t.intrun);}
   t.intrun=setInterval('graph.load()',60000*t.state);
   $__("il").innerHTML=s+"("+t.state+"min)";
  }
  return false;
 }
 ,change: function(a){
  var gs,t=this;
  if(sets[a]||data[a]){
   t.src=a;
   gs=(sets[a])?sets[a]:data[a];
   t.height=200;
  }
  else {
   t.src='';
   gs=sets;
   t.height=130;
  }
  $__('imgs').innerHTML=t.html(gs);
  t.load();
  setTimeout("bHeight()",100);
  return false;
 }
};

function bHeight(){
 var max=0;
 if($__('lmenu')===null) return;
 var l=new Array(
  parseInt($__('lmenu').offsetHeight),
  parseInt($__('content').offsetHeight)+parseInt($__('tmenu').offsetHeight),
  parseInt($__('rmenu').offsetHeight)
 );
 //alert(l.toString());
 var dsort=function(a,b){return (b-a);};
 l.sort(dsort);
 $__('alus').style.height=(l[0]+1)+'px';
}

var objURL=new Object();
window.location.search.replace(new RegExp("([^?=&]+)(=([^&]*))?","g"),function($0,$1,$2,$3){objURL[$1]=$3;});

var browser = {
	init: function () {
		this.name = this.string(this.dataBrowser) || "An unknown browser";
		this.version = this.version(navigator.userAgent)
			|| this.version(navigator.appVersion)
			|| "an unknown version";
		this.os = this.string(this.dataOS) || "an unknown OS";
	},
	string: function (data) {
		for (var i=0;i<data.length;i++)	{
			var dataString = data[i].string;
			var dataProp = data[i].prop;
			this.versionSearchString = data[i].versionSearch || data[i].identity;
			if (dataString) {
				if (dataString.indexOf(data[i].subString) != -1)
					return data[i].identity;
			}
			else if (dataProp)
				return data[i].identity;
		}
	},
	version: function (dataString) {
		var index = dataString.indexOf(this.versionSearchString);
		if (index == -1) return;
		return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
	},
	dataBrowser: [
		{
			string: navigator.userAgent,
			subString: "Chrome",
			identity: "Chrome"
		},
		{ 	string: navigator.userAgent,
			subString: "OmniWeb",
			versionSearch: "OmniWeb/",
			identity: "OmniWeb"
		},
		{
			string: navigator.vendor,
			subString: "Apple",
			identity: "Safari",
			versionSearch: "Version"
		},
		{
			prop: window.opera,
			identity: "Opera",
			versionSearch: "Version"
		},
		{
			string: navigator.vendor,
			subString: "iCab",
			identity: "iCab"
		},
		{
			string: navigator.vendor,
			subString: "KDE",
			identity: "Konqueror"
		},
		{
			string: navigator.userAgent,
			subString: "Firefox",
			identity: "Firefox"
		},
		{
			string: navigator.vendor,
			subString: "Camino",
			identity: "Camino"
		},
		{		// for newer Netscapes (6+)
			string: navigator.userAgent,
			subString: "Netscape",
			identity: "Netscape"
		},
		{
			string: navigator.userAgent,
			subString: "MSIE",
			identity: "Explorer",
			versionSearch: "MSIE"
		},
		{
			string: navigator.userAgent,
			subString: "Gecko",
			identity: "Mozilla",
			versionSearch: "rv"
		},
		{ 		// for older Netscapes (4-)
			string: navigator.userAgent,
			subString: "Mozilla",
			identity: "Netscape",
			versionSearch: "Mozilla"
		}
	],
	dataOS : [
		{
			string: navigator.platform,
			subString: "Win",
			identity: "Windows"
		},
		{
			string: navigator.platform,
			subString: "Mac",
			identity: "Mac"
		},
		{
			   string: navigator.userAgent,
			   subString: "iPhone",
			   identity: "iPhone/iPod"
	    },
		{
			string: navigator.platform,
			subString: "Linux",
			identity: "Linux"
		}
	]

};
browser.init();
