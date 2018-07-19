var fs = require('fs'),
    input = __dirname.replace(/bin/, 'public') + '/flydog_data/aksi/arc-file-aksi.json',
    time = new Date(),
    cd = timestr(time),
    last = 0,
    file,
    path = '',
    station = 'WTHR2017FD0001L',
    debug = 0,
    dir;

process.argv.forEach(function(val, index, array) {
    if (!array) array = [];
    if (index === 2 && val) {
        input = val;
    }
    if (index === 3 && val) {
        station = val;
    }
    if (index === 4 && val) {
        debug++;
    }

});
path = fs.realpathSync(input) || '';
if (!path) throw 'Could not resolve input file path:' + input;
dir = path.match(/.*\//);

function timestr(time) {
    if (typeof time === 'number') time = new Date(time);
    //ensure that localtime is used
    //time.setTime( time.getTime() - time.getTimezoneOffset()*60*1000 );
    var month = time.getMonth() + 1;
    var day = time.getDate();
    var hours = time.getHours();
    var minutes = time.getMinutes();
    var datestr = time.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
    var tstr = (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
    var date = time.getFullYear() + (month < 10 ? '0' : '') + month + (day < 10 ? '0' : '') + day;
    return [datestr, date, day, time, tstr];
}

function getLast(file) {
    var last = '',
        ret = 0;
    if (file) {
        try {
            var obj = fs.readFileSync(file, 'utf-8');
            if (obj) {
                last = obj.trim().split('\n').pop();
                if (last) last = last.match(/^(\d+\s\d\d:\d\d)/);
                if (last) last = last[1].replace(/(\d\d\d\d)(\d\d)(\d\d)/, '$1-$2-$3');
                if (last) ret = new Date(last).getTime();
            }
        } catch (e) {}
    }
    //console.log('got last: '' + last + '' from file: ' + file )
    return ret;
}

function fromFlydogTimeStr(time) {
    var ret = 0;
    //12092017145447
    //console.log('fromTimeStr time:' + time);
    var last = time.match(/^(\d\d)(\d\d)(\d\d\d\d)(\d\d)(\d\d)/);
    var date = last[3] + '-' + last[2] + '-' + last[1] + ' ' + last[4] + ':' + last[5] + ':00 GMT';
    //console.log('fromTimeStr date:' + date);
    if (last) {
        var d = new Date(date);
        ret = d.getTime(); // + (d.getTimezoneOffset()*60*1000);

    }
    //console.log('got time: ' + new Date(ret));
    return ret;
}

function toFlydogTimeStr(time) {
    if (typeof time === 'number') time = new Date(time);
    var month = time.getUTCMonth() + 1;
    var day = time.getUTCDate();
    var hours = time.getUTCHours();
    var minutes = time.getUTCMinutes();
    //var seconds = time.getUTCSeconds();
    var datestr = (day < 10 ? '0' : '') + day +
        (month < 10 ? '0' : '') + month +
        time.getUTCFullYear() +
        (hours < 10 ? '0' : '') + hours +
        (minutes < 10 ? '0' : '') + minutes + '00';
    return datestr;
}

/*
{
'device-type': 'dev_weatherstation',
'device-id': 'WTHR2017FD0001L',
'data-from': '31122016100408',
'total-samples': 392648,
'data-to': '12092017145447',
'config-string': {
'columns': [
{'name': 'PAR', 'unit': 'umol/s/m^2', 'field': 'par'},
{'name': 'Wind Angle', 'unit': 'Deg', 'field': 'wind_angle'},
{'name': 'Wind Speed', 'unit': 'm/s', 'field': 'wind_speed'},
{'name': 'Air Temperature', 'unit': 'C', 'field': 'air_temp'},
{'name': 'Pressure', 'unit': 'bar', 'field': 'pressure'},
{'name': 'Relative Humidity', 'unit': '%', 'field': 'humidity'}
]
},
'date-format': '%d%m%Y%H%M%S'
}
{
'timestamp': '12092017145447',
'data': {
'wind_angle': '197.27',
'par': 42.5127,
'air_temp': '16.09',
'wind_speed': '3.50',
'humidity': '72.08',
'pressure': '1.00'
}
}
*/

var request = require('request');
var xdata = {};
var done = 0;

function avg(a, b) {
    if (!a && !b) return 0;
    b = parseFloat(b);
    a = parseFloat(a);
    if (!a || isNaN(a)) return isNaN(b) ? 0 : b;
    if (!b || isNaN(b)) return isNaN(a) ? 0 : a;
    var c = ((a + b) / 2).toFixed(2);
    return isNaN(c) ? 0 : c;
}

function max(a, b) {
    if (!a && !b) return 0;
    b = parseFloat(b);
    a = parseFloat(a);
    if (!a || isNaN(a)) return isNaN(b) ? 0 : b;
    if (!b || isNaN(b)) return isNaN(a) ? 0 : a;
    return a >= b ? a : b;
}

function averageData(data) {
    var ret = [],
        av = [],
        i = 0,
        j = data.length,
        last = j - 1;
    for (; i < j; ++i) {
        var dd = data[i],
            time = new Date(dd[0]),
            wd = timestr(time);
        av = [
            wd[1] + ' ' + wd[4], //1 time
            avg(av[1], dd[1]), //2 air temp
            0, //3 heat_index
            0, //4 dewpoint
            avg(av[4], dd[4]), //5 wind angle
            avg(av[5], dd[5]), //6 wind avg
            max(av[6], dd[5]), //7 wind max
            avg(av[7], dd[6]), //8 humid
            avg(av[8], dd[7]), //9 pressure
        ];
        //console.log('[ '+i+', ' + (time.getMinutes()%5) + ', ' + dd.join(',')+']');
        //console.log('[ '+i+', ' + (time.getMinutes()%5) + ', ' + av.join(',')+']');
        if (time.getMinutes() % 5 === 0) {
            ret.push(av.join('\t'));
            av = [];
        }
    }
    return ret;
}

function finish() {
    process.exit(0);
}

function lastData(data) {
    var ret = [],
        av = [],
        j = data.length,
        i = data.length - 5;
    if (i < 0) i = 0;
    for (; i < j; ++i) {
        var dd = data[i],
            time = new Date(dd[0]),
            wd = timestr(time);
        av = [
            wd[1] + ' ' + wd[4], //1 time
            dd[1], //2 air temp
            0, //3 heat_index
            0, //4 dewpoint
            dd[4], //5 wind angle
            dd[5], //6 wind avg
            max(av[6], dd[5]), //7 wind max
            dd[6], //humid
            dd[7], //pressure
        ];
        ret.push(av.join('\t'));
    }
    return ret;
}

function parseOut(ret, fn) {
    var done = 0;
    var i = 0,
        val;
    if (debug) console.log('get done, start parse data.');
    for (val in ret) {
        //console.log('input row:' + val);
        if (val && ret[val].length) {
            ret[val].sort(function(a, b) { return a[0] - b[0]; });
            var data = averageData(ret[val]);
            //data.reverse();
            //console.log(ret[val]);
            //console.log(data.join('\n'));
            file = dir + 'ARC-' + val + '.txt';
            fs.appendFile(file, (data.join('\n') + '\n').replace(/\n+/m,'\n'), function(err) {
                if (err) console.log('ERR: not saved ' + file + ':' + err);
                else if (debug) console.log('Saved ' + file);
                var last = lastData(ret[val]);
                fs.appendFile(dir + 'last.txt', (last.join('\n') + '\n').replace(/\n+/m,'\n'), function(err) {
                    if (err) console.log('ERR: not saved ' + file + ':' + err);
                    else if (debug) console.log('Saved ' + file);
                    if (fn) fn();
                    else finish();
                });
            });
        }
    }
}

var myrunningrequests = 0;
var requestsdone = 0;

function getData(time) {
    var url = 'http://sensornest.flydog.eu/api-v1/' + station + '/' + time + '/';
    if (debug) console.log('[' + done + '] get: ' + url);
    request.get({ method: 'GET', uri: url, headers: { 'User-agent': '//ilm.majasa.ee/' }, timeout: 1500, json: true },
        function(error, response, body) {
            if (!error && response.statusCode == 200) {
                var json = body || {};
                if (json.timestamp && !json.error) {
                    var wd = timestr(fromFlydogTimeStr(json.timestamp));
                    if (!xdata[wd[0]]) xdata[wd[0]] = [];
                    if (debug) console.log(json.timestamp+" "+JSON.stringify(json.data));
                    xdata[wd[0]].push(
                        [wd[3], //time
                            json.data.air_temp, //temp
                            0, // percip
                            0, // dewpoint
                            json.data.wind_angle, //wind_dir
                            json.data.wind_speed, //wind_speed
                            json.data.humidity, //humid
                            json.data.pressure * 1000 //pressure
                        ]);
                } else {
                    if (debug) console.log('bad response: '+ JSON.stringify(body));
                    --myrunningrequests;
                }
            }
            if (debug) console.log('[' + done + '] done.');
            --done;
            //if (requestsdone==1 && done==0) parseOut(xdata, finish);
        }
    );
}

function parseOutWaiter() {
    if (!requestsdone || done) setTimeout(parseOutWaiter, 1000);
    else parseOut(xdata, finish);
}

function getAllDataRecursive(a, b) {
    var j = 0,
        t;
    if (b > a && myrunningrequests < 121) {
        ++done;
        a+=(60 * 1000);
        getData(toFlydogTimeStr(a));
        setTimeout(function(t) {
            //if (debug) console.log('next bunch: '+ a + ' ' + myrunningrequests);
            getAllDataRecursive(a, b);
        }, 1010, a);
        ++myrunningrequests;
    } else {
        requestsdone = 1;
        parseOutWaiter();
    }
}

function getAllData(first, last) {
    var i = first + (60 * 1000),
        j = 0,
        t;
    while (i < last) {
        //if (debug) console.log('place request [' + j + '] as ' + new Date(i).toISOString());
        t = i;
        //setTimeout(function(t) {
        getData(toFlydogTimeStr(t));
        //}, j * 1000, i);

        ++done;
        i += (60 * 1000);
        ++j;
        if (j > 10) break;
    }
    setTimeout(finish, 60 * 1000 * 10); //10 minutes max allowed.
}


function parse() {
    var json = require(path);
    if (json) {
        var last = fromFlydogTimeStr(json['data-to']),
            d = last,
            day = 24 * 3600 * 1000,
            max = 7 * day;
        var wd = timestr(d);
        var first = getLast(dir + 'ARC-' + wd[0] + '.txt');
        while (!first) {
            d = d - day;
            wd = timestr(d);
            first = getLast(dir + 'ARC-' + wd[0] + '.txt');
            if (last - d > max) break;
        }
        //console.log('last:'+last+' first:' + first);
        if (!first) {
            first = last - day;
        }
        //console.log('last:'+last+' first:' + first);
        if (debug) console.log('Get Flydog data from ' + new Date(first) + ' to ' + new Date(last));
        getAllDataRecursive(first, last);
    }
}

parse();

/*
fs.readFile(path, {encoding:'utf-8'}, function(err, data) {
	if(err) throw err;
	var child = [],
	text = ', trs, ret=[], test, d=0, m=0, wd=[], wdata=[];
	wd = data.split(/\n/);
	//console.log(JSON.stringify(wd));
	var i=0,len=wd.length,a=';
	for(;i<len;++i){
		a=wd[i];
	//wd.forEach(function(a,b){
		child = a.split('\t');
		if(child.length<2) continue;
		if(i===0) {
			text = child[1].replace(/^(\d*)\.(\d*)\.(\d*) /,'20$3$2$1 ');
			ret[0] = text;
		}
		text = (child[1]+').replace(/\s.*$/,').replace(/\-/g,'0').trim();
		if(/^Air\stemp/.test(a))     ret[1] = text;
		if(/^Precip\.\sint/.test(a)) ret[2] = text==='-'?0:text;
		if(/^Air\shumidity/.test(a)) ret[3] = text;
		if(/^Dew\spoint/.test(a))    ret[4] = text;
		if(/^Max\swind\ssp/.test(a)) ret[5] = text;
		if(/^Wind\sdir./.test(a))    ret[6] = extractWd(child[1]);
		if(/^Wind\sspeed/.test(a))   ret[7] = text;
		if(/^Visibility/.test(a))    ret[8] = text;
	//});
}
if (ret.length) {
	//console.log(ret.join('\t'));
	wdata.push(ret.join('\t'));
}
if(wdata){
	var j = wdata.length-1, t = 0, val, mc;
	d = time.getTime();
	wd = timestr(d);
	test = false;
	ret = {};
	ret[wd[0]]=[];
	last=getLast(dir+'ARC-'+wd[0]+'.txt');
	//console.log('last in input file: ' + wdata[j].match(/\d+:\d+/));
	for(; j >= 0; --j){
		mc = wdata[j].match(/^(\d*) (\d+):/);
		m = mc && mc[2] ? mc[2] : 0;
		if(test && /^(1|2)\d/.test(m)) {
			test=false;
			d = d-(24*3600*1000);
			wd = timestr(d);
			ret[wd[0]]=[];
			last=getLast(dir+'ARC-'+wd[0]+'.txt');
		}
		if(/00/.test(m)) test = true;
		mc = wdata[j].match(/^\d* (\d+:\d+)/);
		t = new Date(wd[0] + ' ' + (mc && mc[1] ? mc[1] : '00:00')).getTime()||0;
		//console.log(t + ' '+ last);
		//console.log(wdata[j].split(/\s+?/));
		if(!last||(t&&t>last)) {
			ret[wd[0]].push(wdata[j]);
		}
	}
	i=0;
	for(val in ret){
		if(val && ret[val].length){
			ret[val].reverse();
			//console.log(ret[val]);
			//console.log(ret[val].join('\n'));
			file = dir+'ARC-'+val+'.txt';
			fs.appendFile(file, ret[val].join('\n')+'\n');
			//if(i===0) {
			//	fs.writeFileSync(dir+'last.txt', ret[val].join('\n')+'\n');
			//	++i;
			//} else
			fs.appendFile(dir+'last.txt',ret[val].join('\n')+'\n');
		}
	}
}
});
*/