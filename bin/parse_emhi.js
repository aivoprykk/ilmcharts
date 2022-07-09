var request = require('request'),
cheerio = require('cheerio'),
fs = require('fs'),
input = __dirname.replace(/bin/,"public")+"/emhi_data/haapsalu/arc-file-haapsalu.html",
time = new Date(),
cd=timestr(time),
last = 0,
file,
path = '',
debug = 0,
dir;

process.argv.forEach(function (val, index, array) {
	if(index===2 && val) {
		input=val;
	}
    if (index === 3 && val) {
        station = val;
    }
    if (index === 4 && val) {
        debug++;
    }
});

if (!fs.existsSync(input)) throw "Could not find input file:" + input;
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
	if(debug) console.log('last:"' + last + '",ret:"' + ret + '",file: "' + file + '"');
	return ret;
}
//dir = input.match(/.*\//);
//file=dir+"ARC-"+cd[0]+".txt";
//console.log(getLast(file));

fs.readFile(path, function(err, data) {
	if(err) throw err;
	var $ = cheerio.load(data), child,
	text, trs, ret, test, d=0, m=0, wd=[], wdata=[];
	var cols=0, wtemp=0, atemp=0, mode=0;
	var datadate, dd=$(".data-date"), datatime;
	if(dd.length==0) {
		dd=$(".utc-info");
		mode=1;
	}
	if(dd.length==0) {
		dd=$(".direction-compass span");
		mode=2;
	}
	if(dd.length && mode==2) {
		try {
			datadate = dd.text().trim();
			datadate = new Date(datadate.replace(/^(\d*)\.(\d*)\.(\d*)\s+kell\s+/,'$3-$2-$1 '));
			//if(debug) console.log("datadate(mode2): "+datadate);
		} catch(e) {
			datadate = time;
		}
	}
	else if(dd.length && mode==1) {
		try {
			datadate = dd.text().trim();
			datadate = new Date(datadate.replace(/^UTC (\d*)\.(\d*)\.(\d*)\s+(\d*):(\d*)/,'$3-$2-$1 $4:$5:00'));
			//if(debug) console.log("datadate(mode1): "+datadate);
		} catch(e) {
			datadate = time;
		}
	} else {
		try {
			datadate = dd.text().trim();
			datadate = new Date(datadate.replace(/^(\d*)\.(\d*)\.(\d*)\s+kell\s+/,'$3-$2-$1 '));
			//if(debug) console.log("datadate(mode0): "+datadate);
		} catch(e) {
			datadate = time;
		}
	}

	$(".table tr").each(function(){
		
		trs = $(this).find(".number");
		ret = []; test = false;
		trs.each(function(a){
			child = $(this);
			text = child.text().trim();
			//if(debug) console.log(a+' -> ' + test + ' -> ' +text);
			if(mode==0||mode==2) {
				ret.push(text.replace(/,/g, "."));
				if(a===1) {
					//none
				}
				else if(a===3) {
					if(/(parnu|montu|sorve)/.test(path)) ret.push(""); //mootjal ei ole ohutemperatuuri
					if(text) test = true;
				}
				else if(a>=3 && text && !test) {
					test = true;
				}
			}
		});
		if (ret.length&&test) {
			//if(debug) console.log(ret);
			wdata.push(ret.join("\t"));
		}
	});
	//if(debug) console.log(path+" " + err + " " + wdata);
	if(wdata){
		var j = wdata.length-1, t = 0, val, mc;
		d = datadate.getTime();
		wd = timestr(d);
		test = false;
		ret = {};
		ret[wd[0]]=[];
		last=getLast(dir+"ARC-"+wd[0]+".txt");
		//console.log("last in input file: " + wdata[j].match(/\d+:\d+/));
		for(; j >= 0; --j){
			mc = wdata[j].match(/^(\d+):/);
			m = mc && mc[1] ? mc[1] : 0;
			if(test && /^(1|2)\d/.test(m)) {
				test=false;
				d = d-(24*3600*1000);
				wd = timestr(d);
				ret[wd[0]]=[];
				last=getLast(dir+"ARC-"+wd[0]+".txt");
			}
			if(/00/.test(m)) test = true;
			mc = wdata[j].match(/^\d+:\d+/);
			t = new Date(wd[0] + " " + (mc && mc[0] ? mc[0] : "00:00")).getTime()||0;
			//console.log(t + " "+ last);
			//if(debug) console.log(wdata[j].split(/\s+?/));
			if(!last||(t&&t>last)) {
				ret[wd[0]].push(wd[1] + " " + wdata[j]);
			}
		}
		i=0;
		for(val in ret){
			if(val && ret[val].length){

				ret[val].reverse();
				//console.log(ret[val]);
				//console.log(val + " >> " + ret[val].join("\n"));
				file = dir+"ARC-"+val+".txt";
				fs.appendFileSync(file, ret[val].join("\n")+"\n");
				//console.log("vals: " + i + " " + k+ " " + wdata.length);
				//if(i===0) {
				//	fs.writeFileSync(dir+"last.txt", ret[val].join("\n")+"\n");
				//	++i;
				//} else
				fs.appendFileSync(dir+"last.txt",ret[val].join("\n")+"\n");
			}
		}
	}
});

