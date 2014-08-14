var fs = require('fs'),
input = __dirname.replace(/bin/,"public")+"/mnt_data/tamme/arc-file-tamme.html",
time = new Date(),
cd=timestr(time),
last = 0,
file,
path = '',
dir;

process.argv.forEach(function (val, index, array) {
  if(index===2 && val) {
  	  input=val;
  }
});
path = fs.realpathSync(input) || '';
if(!path) throw "Could not resolve input file path:" + input;
dir=path.match(/.*\//);

function timestr(time) {
	if(typeof time === 'number') time=new Date(time);
	var month = time.getMonth()+1;
	var day = time.getDate();
	var datestr = time.getFullYear()+"-"+(month<10?"0":"")+month+"-"+(day<10?"0":"")+day;
	var date = time.getFullYear()+(month<10?"0":"")+month+(day<10?"0":"")+day;
	return [datestr,date,day];
}

function getLast(file) {
	var last="", ret = 0;
	if(file) {
		try {
		var obj = fs.readFileSync(file, 'utf-8');
		if(obj){
			last = obj.trim().split("\n").pop();
			if(last) last = last.match(/^(\d+\s\d\d:\d\d)/);
			if(last) last = last[1].replace(/(\d\d\d\d)(\d\d)(\d\d)/,"$1-$2-$3");
			if(last) ret = new Date(last).getTime();
		}
		} catch (e) {
		}
	}
	//console.log("got last: '" + last + "' from file: " + file )
	return ret;
}
//dir = input.match(/.*\//);
//file=dir+"ARC-"+cd[0]+".txt";
//console.log(getLast(file));
/*
43 13.08.14 12:30 01.01.70 03:00
Air temp. 19.9 C 13.08.14 12:30 #000000 #FFFFFF
Road status kuiv 13.08.14 12:30 #C8C8C8 #FFFFFF
Road temp. 29.3 C 13.08.14 12:30 #000000 #FFFFFF
Precip. int. - mm/h 13.08.14 12:30 #000000 #FFFFFF
Precip. type - 13.08.14 12:30 #269936 #FFFFFF
Air humidity 74.0 % 13.08.14 12:30 #000000 #FFFFFF
Dew point 15.2 C 13.08.14 12:30 #000000 #FFFFFF
Max wind sp. 4.4 m/s 13.08.14 12:30 #000000 #FFFFFF
Wind dir. <img src="img/arrow_10.gif" border=0> deg 13.08.14 12:30 #000000 #FFFFFF
Wind speed 1.5 m/s 13.08.14 12:30 #000000 #FFFFFF
Visibility 2000 m 13.08.14 12:30 #000000 #FFFFFF
Sunrise 05:38 black white
Sunset 21:01 black white
*/

fs.readFile(path, {encoding:'utf-8'}, function(err, data) {
	if(err) throw err;
	var child,
	text = "", trs, ret=[], test, d=0, m=0, wd=[], wdata=[];
	wd = data.split(/\n/);
	//console.log(JSON.stringify(wd));
	wd.forEach(function(a,b){
		child = a.split('\t');
		if(b===0) {
			text = child[1].replace(/^(\d*)\.(\d*)\.(\d*) /,'20$3$2$1 ');
			ret[0] = text;
		}
		text = (child[1]+"").replace(/\s.*$/,"").replace(/\-/g,"0").trim();
		if(/^Air\stemp/.test(a))     ret[1]=text;
		if(/^Precip\.\sint/.test(a)) ret[2] = text==='-'?0:text;
		if(/^Air\shumidity/.test(a)) ret[3] = text;
		if(/^Dew\spoint/.test(a))    ret[4] = text;
		if(/^Max\swind\ssp/.test(a)) ret[5] = text;
		if(/^Wind\sdir./.test(a))    ret[6] = extractWd(child[1]);
		if(/^Wind\sspeed/.test(a))   ret[7] = text;
		if(/^Visibility/.test(a))    ret[8] = text;
	});
		if (ret.length) {
			//console.log(ret.join("\t"));
			wdata.push(ret.join("\t"));
		}
	if(wdata){
		var j = wdata.length-1, t = 0, val;
		d = time.getTime();
		wd = timestr(d);
		test = false;
		ret = {};
		ret[wd[0]]=[];
		last=getLast(dir+"ARC-"+wd[0]+".txt");
		//console.log("last in input file: " + wdata[j].match(/\d+:\d+/));
		for(; j >= 0; --j){
			m = wdata[j].match(/^(\d*) (\d+):/)[2];
			if(test && /^(1|2)\d/.test(m)) {
				test=false;
				d = d-(24*3600*1000);
				wd = timestr(d);
				ret[wd[0]]=[];
				last=getLast(dir+"ARC-"+wd[0]+".txt");
			}
			if(/00/.test(m)) test = true;
			t = new Date(wd[0] + " " + wdata[j].match(/^\d* (\d+:\d+)/)[1]).getTime()||0;
			//console.log(t + " "+ last);
			//console.log(wdata[j].split(/\s+?/));
			if(!last||(t&&t>last)) {
				ret[wd[0]].push(wdata[j]);
			}
		}
		for(val in ret){
			if(val && ret[val].length){
				ret[val].reverse()
				//console.log(ret[val]);
				//console.log(ret[val].join("\n"));
				file = dir+"ARC-"+val+".txt";
				fs.appendFile(file, ret[val].join("\n")+"\n");
			}
		}
	}
});

var extractWd = function(d) {
	var s = d.match(/arrow_(\d*).gif/) || [];
	if(s[1]){
		if(s[1] == 1) return 0;
		if(s[1] == 2) return 22.5;
		if(s[1] == 3) return 45;
		if(s[1] == 4) return 67.5;
		if(s[1] == 5) return 90;
		if(s[1] == 6) return 112.5;
		if(s[1] == 7) return 135;
		if(s[1] == 8) return 157.5;
		if(s[1] == 9) return 180;
		if(s[1] == 10) return 202.5;
		if(s[1] == 11) return 225;
		if(s[1] == 12) return 247.5;
		if(s[1] == 13) return 270;
		if(s[1] == 14) return 292.5;
		if(s[1] == 15) return 315;
		if(s[1] == 16) return 337.5;
	}
	else { return 0 };
}

