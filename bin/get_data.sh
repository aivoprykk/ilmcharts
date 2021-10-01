#!/bin/bash

now=$(date '+%Y%m%d%H%M%S')
lab=0
force=0
test=0
dry=""
last=""
station=""
max=200
dir=$(dirname $0)
meinfo='//ilm.majasa.ee/'
path=$(cd "$dir"; pwd|perl -ne 's!/?bin/?$!!;print')
[ -d $path ] || { echo $path not found; exit; }
while [ $# -ge 1 ]; do
        case "$1" in
                *force)
                	force=1
                	lab=1
                	shift
                	;;
                *lab)
                    lab=1
                    shift
                    ;;
                *test)
                    test=1
                    shift
                    ;;
                *dry)
                    dry="1"
                    shift
                    ;;
                *jaam=*)
                	station=${1/jaam=/};
                	shift
                	;;
        esac
        shift
done

if [ x$DRY != x ]; then
  dry=1
fi
if [ x$LAB != x ]; then
  lab=1
fi

rotate () {
  local ext=$1
  local dir=$2
  local n=$3
  local num=1
  local base=${n/\.${ext}/}
  (
  cd $dir;
  local b=""
  local c=""
  local d=""
  [ -f ${n} ] || return 1;
  [ -f ${base}.001.${ext} ] && diff ${n} $base.001.$ext >/dev/null && return 2;
  ls -r *.*.${ext} 2>/dev/null|while read a; do
    b=${a/\.*/};
    c=${a/.${ext}/}
    #d=`echo $c|sed 's/.*\.0\+//'`;
    d=${c/*./}
    d=`echo $d|sed -e 's/^0\+//'`;
    if [ x$c != x ]; then
      let 'd=d+1'
    else
      d=$num
    fi
    if [ $num -gt $max ]; then continue; fi
    d=`printf "%03d" $d`;
  if [ $lab -gt 0 ]; then
    echo "cp -f ${a} ${b}.${d}.$ext"
  fi
    cp -f $a $b.${d}.${ext};
  done
  if [ $lab -gt 0 ]; then
    echo "cp -f ${n} $base.001.$ext"
  fi
  cp -f ${n} $base.001.$ext;
  )
  return 0;
}

#<nextupdate>2013-05-13T19:00:00</nextupdate>
yrfilter='$ltime=$time=time;
if(/<nextupdate>/) {
s/^.*<nextupdate>([^\<]+)<.*$/$1/;
if(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/){
$year=$1;$month=$2;$mday=$3;$hour=$4;$min=$5;$sec=$6;
$ltime=timelocal($sec,$min,$hour,$mday,$month-1,$year-1900);
print $ltime - $time;
exit 0;
}
print 0;
exit 0;
}'
#Mon, 13 May 2013 16:55:00 +0000
wgfilter='$gmtime=$time=time;
%months=("Jan"=>1,"Feb"=>2,"Mar"=>3,"Apr"=>4,"May"=>5,"Jun"=>6,"Jul"=>7,"Aug"=>8,"Sep"=>9,"Oct"=>10,"Nov"=>11,"Dec"=>12);
if(/update_next/) {
s/^.*update_next":"([^\"]+)".*$/$1/;
if(/^\w+, (\d{2}) (\w+) (\d{4}) (\d{2}):(\d{2}):(\d{2})/){
$year=$3;$month=$months{$2};$mday=$1;$hour=$4;$min=$5;$sec=$6;
$gmtime=timegm($sec,$min,$hour,$mday,$month-1,$year-1900);
print $gmtime - $time;
exit 0;
}
elsif(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/){
$year=$1;$month=$2;$mday=$3;$hour=$4;$min=$5;$sec=$6;
$gmtime=timegm($sec,$min,$hour,$mday,$month-1,$year-1900);
print $gmtime - $time;
exit 0;
}
print 0;
exit 0;
}'

#Mon, 13 May 2013 16:55:00 +0000
#"updated_at": "2021-09-30T13:53:30Z"
yr2filter='$mtime=$gmtime=$time=time;
%months=("Jan"=>1,"Feb"=>2,"Mar"=>3,"Apr"=>4,"May"=>5,"Jun"=>6,"Jul"=>7,"Aug"=>8,"Sep"=>9,"Oct"=>10,"Nov"=>11,"Dec"=>12);
if(/updated_at/) {
s/^.*updated_at":"([^\"]+)".*$/$1/;
if($time0=~/^\w+, (\d{2}) (\w+) (\d{4}) (\d{2}):(\d{2}):(\d{2})/){
$year=$3;$month=$months{$2};$mday=$1;$hour=$4;$min=$5;$sec=$6;
$time=timegm($sec,$min,$hour,$mday,$month-1,$year-1900);
}
if(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/){
$year=$1;$month=$2;$mday=$3;$hour=$4;$min=$5;$sec=$6;
$gmtime=timegm($sec,$min,$hour+1,$mday,$month-1,$year-1900);
print ($gmtime - $time);
exit 0;
}
print 0;
exit 0;
}'

empgfilter='$ltime=$time=time;
if(/forecast":\{"tabular/) {
s/^.*forecast":\{"tabular":\{"time":\[\{".attributes":\{"from":"([^\"]+)".*$/$1/;
if(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/){
$year=$1;$month=$2;$mday=$3;$hour=$4;$min=$5;$sec=$6;
$ltime=timelocal($sec,$min,$hour,$mday,$month-1,$year-1900);
print (($ltime + (3600*6)) - $time);
exit 0;
}
print 0;
exit 0;
}'



xtime () {
	local dir=$1
	local file=$2
	local p=$3
	local nail=$p"nail"
	local filter=$p"filter"
	local time=-1;
  local time0="$4"
  [ ! -f ${dir}/${file} ] && echo 0 && return 0;
	time=$(cat ${dir}/${file} | perl -MTime::Local -ne "\$time0=\"${time0}\";${!filter}")
	[ x"$time" = x"" ] && time=-1
	echo $time
}

(
cd $path;
i=0
cat $path/places.conf|grep -v '^#'|while read j; do
#for j in "${places[@]}"; do
#echo "$j "
let 'i=i+1'
#[ $i -gt 3 ] && { echo "$j over quota" && continue; }

IFS=:
set $j
place=$1
title=$2
coord=$(echo "${13}"|tr -d '[:space:]');
lat=${coord/,*/};
lon=${coord/*,/};
names="wg:$3 yr:$4 emhi:$5 mnt:$6 zoig:${7} emu:${8} ut:${9} my:${10} empg:${11} fld:${12} yr2:${coord}";
IFS=' '
  IFS=','; coord=($value); IFS=' ';

(
cd public
#echo "data: "$place $title $wg $yr;
[ $test -eq 0 ] || continue;
[ x"$place" = x"" ] && continue;
for x in $names; do
name="${x/:*/}";
value="${x/*:/}";

#echo "$place $name $value";
[ x"$value" = x"" ] && continue;
#continue;
[ x"$station" != x"" -a "$place" != "$station" ] && continue;
#[ x$place = xparnu ] || continue;
case "$name" in
wg)
	url='http://www.windguru.cz/int/widget_json.php?callback=wg_data&lng=ee&s='$value'&params=[WINDSPD,GUST,MWINDSPD,SMER,TMPE,TCDC,APCPs]&odh=0&doh=24&fhours=72&wj=msd&tj=c&waj=m&lng=ee'
	out=wg_data/$place
	file=windguru_forecast.json
	;;
yr2)
  out=yr_data2/$place
	url="https://api.met.no/weatherapi/locationforecast/2.0/?lat=${lat}&lon=${lon}"
  file=yr_forecast.json
	;;

empg)
  url="https://www.ilmateenistus.ee/wp-content/themes/emhi2013/meteogram.php/?coordinates=${lat},${lon}"
  out=empg_data/$place
  file=empg_forecast.json
  ;;

*)
	continue;
	;;
esac

#echo "$name $value $out"
[ -d "${out}" ] || {  [ x"$out" != x"" ] && mkdir -p "${out}" || continue; }
if [ "$name" = 'yr2' ]; then
  t0="$(curl --head --silent $url|grep Last-Modified|sed -e 's/Last-Modified: //')"
fi
t=$(xtime ${out} ${file} ${name} "${t0}");
if [ $lab -gt 0 ]; then
  echo "$name secs "$t
fi

#continue

if [ $force -gt 0 -o $t -le 0 ]; then
  #[ $name = "wg" ] && rotate json ${out} ${file}
  #[ $name = "yr" ] && rotate xml ${out} ${file}
  if [ $lab -gt 0 -o x$dry != x ]; then
    echo wget -T10 --tries=1 -U "$meinfo" -q -O ${out}/${file}.tmp "${url}"
  fi
  if [ x"$dry" = x"" ]; then
    wget -T10 --tries=1 -U "$meinfo" -q -O ${out}/${file}.tmp "${url}"
    if [ x"$file2" != x"" ]; then
      wget -T10 --tries=1 -U "$meinfo" -q -O ${out}/${file2}.tmp "${url2}"
    fi
  fi
  t=`xtime ${out} ${file}.tmp ${name} "${t0}"`
  if [ $lab -gt 0 ]; then
    echo "next update time: $t"
  fi
  if [ -e "${out}/${file}.tmp" ]; then
    if [ -e "${out}/${file}" -a $t -gt 0 ]; then
      if [ x$dry = x ]; then
          mv "${out}/${file}" "${out}/${file}.${now}"
      else
          echo mv "${out}/${file}" "${out}/${file}.${now}"
      fi
    fi
    if [ x$dry = x ]; then
      mv -f "${out}/${file}.tmp" "${out}/${file}"
    else
      echo mv -f "${out}/${file}.tmp" "${out}/${file}"
    fi
  fi
  if [ x"$file2" != x"" ]; then
    if [ -e "${out}/${file2}.tmp" ]; then
      if [ -e "${out}/${file2}"  -a $t -gt 0 ]; then
        if [ x$dry = x ]; then
          mv "${out}/${file2}" "${out}/${file2}.${now}"
        else
          echo mv "${out}/${file2}" "${out}/${file2}.${now}"
        fi
      fi
      if [ x$dry = x ]; then
        mv -f "${out}/${file2}.tmp" "${out}/${file2}"
      else
        echo mv -f "${out}/${file2}.tmp" "${out}/${file2}"
      fi
    fi
  fi
  #rm -f ${out}/${file}.tmp
fi

done ##split conf
)

done ##places
)
