var request = require('request'),
cheerio = require('cheerio'),
fs = require('fs'),
input = __dirname.replace(/bin/,"public")+"/emhi_data/haapsalu/arc-file-haapsalu.html",
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
	//console.log("got last: '" + last + "' from file: " + file )
	return ret;
}
//dir = input.match(/.*\//);
//file=dir+"ARC-"+cd[0]+".txt";
//console.log(getLast(file));

fs.readFile(path, function(err, data) {
	if(err) throw err;
	var $ = cheerio.load(data), child,
	text, trs, ret, test, d=0, m=0, wd=[], wdata=[];
	$(".table tr").each(function(){
		trs = $(this).find(".number");
		ret = []; test = false;
		trs.each(function(a){
			child = $(this);
			text = child.text().trim();
			ret.push(text.replace(/,/g,"."));
			if(a===2 && text) {
				if(/parnu/.test(path)) ret.push("");
				test = true;
			}
		});
		if (ret.length&&test) {
			//console.log(ret);
			wdata.push(ret.join("\t"));
		}
	});
	var datadate=$(".data-date").text().trim();
	try {
		datadate = new Date(datadate.replace(/^(\d*)\.(\d*)\.(\d*)\s+kell\s+/,'$3-$2-$1 '));
		//console.log("datadate: "+datadate);
	} catch(e) {
		datadate = time;
	}
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
			//console.log(wdata[j].split(/\s+?/));
			if(!last||(t&&t>last)) {				
				ret[wd[0]].push(wd[1] + " " + wdata[j]);
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

