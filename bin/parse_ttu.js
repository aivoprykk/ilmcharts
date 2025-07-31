var cheerio = require('cheerio'),
fs = require('fs'),
input = __dirname.replace(/bin/,"public")+"/ttu_data/parnu/arc-file-parnu.html",
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
	text, trs, ret, test, d=0, m=0, wd=[];
	
	const rows = $('.marker_tbl tr');

        const getVal = (label) =>
            rows.filter((i, el) => $(el).text().includes(label))
                .find('td:nth-child(2)')
                .text().trim();

	const datetime = getVal('Last data:'); // e.g., 30.07.2025 16:10
	if(datetime) {
    	var t = 0, val, mc;
		const parts = datetime.split(/[\s.:]/); // ["30", "07", "2025", "16", "10"]
		const formattedDatetime = `${parts[2]}${parts[1]}${parts[0]} ${parts[3]}:${parts[4]}`;
		const formattedDatetime2 = `${parts[2]}-${parts[1]}-${parts[0]} ${parts[3]}:${parts[4]}`;
		d = new Date(formattedDatetime2).getTime();
	 	var wd = timestr(d), sl = [0, 0], ww = [0, 0], row = '';
		last=getLast(dir+"ARC-"+wd[0]+".txt");
		
		if(d > last) {
			const wind = getVal('Wind speed / gust:') || 0; // e.g., 7.3 / 10.4 m/s
			const windDir = getVal('Wind direction:').match(/\d+/)?.[0] || 0; // e.g., 194° (degrees)
			const sealevel = getVal('Sealevel') || ''; // +36 / +17 cm
			const airTemp = getVal('Air temperature:').match(/[\d.]+/)?.[0] || 0;
			const waterTemp = getVal('Water temperature:').match(/[\d.]+/)?.[0] || 0;
			const humid = getVal('Humidity:').match(/[\d.]+/)?.[0] || 0;
			const pressure = getVal('Air pressure:').match(/[\d.]+/)?.[0] || 0;
			const rain = getVal('Rain accumulation:').match(/[\d.]+/)?.[0] || 0;

			// Parse values
			if (sealevel)
				sl = sealevel.split('/').map(s => s.replace(/[^\d.]/g, '').trim());
			if (wind)
				ww = wind.split('/').map(s => s.replace(/[^\d.]/g, '').trim());
			// Convert date format
			row = `${formattedDatetime}\t${sl[1]}\t${sl[0]}\t${waterTemp}\t${airTemp}\t${ww[0]}\t${ww[1]}\t${windDir}\t${humid}\t${pressure}\t${rain}`;

			file = dir+"ARC-"+wd[0]+".txt";
			fs.appendFileSync(file, row+"\n");
			fs.appendFileSync(dir+"last.txt",row+"\n");
		}
	}
});
