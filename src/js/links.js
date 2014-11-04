(function (my) {
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
