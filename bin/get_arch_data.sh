#!/bin/bash
PATH=$PATH:/usr/local/bin
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
lab=0
force=0
test=0
dry=""
last=""
station=""
temp=""
dir=`dirname $0`
meinfo='//ilm.majasa.ee/'
echo "$dir" | grep -q '^/' || dir=`pwd`/$dir
path=`echo "$dir"|sed -e 's:/*bin::'`
[ x"$path" = x"" ] && path="." || path=$path
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
(
cd $path

date=`date '+%F'`
min=`date '+%H:%M'`;
i=0
cat $path/places.conf|grep -v '^#'|while read j; do

IFS=:
set $j
place=$1
title=$2
coord=$(echo "${13}"|tr -d '[:space:]');
lat=${coord/,*/};
lon=${coord/*,/};
names="wg:$3 yr:$4 emhi:$5 mnt:$6 zoig:$7 emu:$8 ut:$9 my:${10} empg:${11} flydog:${12}";
IFS=' '
(
cd public
[ $test -eq 0 ] || continue;
[ x"$place" = x"" ] && continue;
for x in $names; do
name=${x/:*/};
value=${x/*:/};
temp=""
minutes=6
#echo "$place $name $value";
[ x"$value" = x"" ] && continue;
#continue;
[ x"$station" != x"" -a "$name" != "$station" ] && continue;
file="ARC-"$date".txt"

case "$name" in
emu)
	url="http://energia.emu.ee/weather/Archive/"$file;
	out=emu_data/$place
	;;
ut)
	url='https://meteo.physic.ut.ee/et/archive.php?do=data';
	url="$url&`date '+begin[year]=%Y&begin[mon]=%m&begin[mday]=%d'`"
	url="$url&`date --date='tomorrow' '+end[year]=%Y&end[mon]=%m&end[mday]=%d'`"
	url="$url&9=1&12=1&10=1&15=1&16=1"
	out=ut_data/$place
	#continue;
	;;
zoig)
	url="http://ilm.zoig.ee/arhiiv/"$value"/";
	out=zoig_data/$place
	;;
emhi)
	url='http://www.ilmateenistus.ee/meri/vaatlusandmed/'$value'/10-minuti-andmed/';
	out="emhi_data/"$place
	temp="arc-file-$place.html"
	minutes=11
	#continue;
	;;
mnt)
	url='http://www.balticroads.net/?getstationdata=1&mapstation='$value
	out="mnt_data/"$place
	temp="arc-file-$place.html"
	minutes=11
	#continue;
	;;
flydog)
  url='http://sensornest.flydog.eu/api-v1/'$value'/'
  out="flydog_data/"$place
  temp="arc-file-$place.json"
  ;;
*)
	continue;
	;;
esac

[ -d "$out" ] || mkdir -p "$out"

if [ -f $out/$file ]; then
last_stamp=`cat $out/$file|tail -1|awk 'match($1, /[0-9][0-9][0-9][0-9][0-9]/){ sub("([0-9][0-9][0-9][0-9])","&-",$1);sub("-([0-9][0-9])","&-") }match($2,/[0-9][0-9]:[0-9][0-9]:[0-9]/){$2=substr($2,1,5)}{ sub(",","",$2); print " " $1 " " $2 }'`
last_min=`echo $last_stamp|awk '{sub("[0-9][0-9]:","",$2);sub("^0","",$2);print $2}';`
last_hour=`echo $last_stamp|awk '{sub(":[0-9][0-9]","",$2);sub("^0","",$2);print $2}';`
cur_min=`echo $min|sed -e 's/.*://;s/^0//'`
cur_hour=`echo $min|sed -e 's/:.*//;s/^0//'`
let 'h=cur_hour-last_hour';
let 'm=cur_min-last_min';
[ $h -lt 0 ] && {
 let 'h=cur_hour+24-last_hour'
}
[ $h -eq 0 -o $h -eq 1 ] && {
  [ $m -lt 0 ] && {
    let 'm=cur_min+60-last_min'
  }
  [ $h -ne 1 -a $m -ge 0 -a $m -lt $minutes ] && {
    if [ $lab -gt 0 ]; then
      echo $place":$name: minuteid vahem kui $minutes: $min > $last_stamp";
    fi
    [ $force -eq 0 ] && continue;
  }
  [ $h -eq 0 -a $m -eq $minutes ] && {
    s=`date '+%S'`
    w=8
    if [ $s -lt $w ]; then
      let 's=w-s'
      [ $force -eq 0 ] && sleep $s
    fi
  }
}
last=$last_stamp
fi

labstr=""
if [ $lab -gt 0 ]; then
  labstr="lab"
  echo "`date '+%F %T'` last:$last_stamp";
  if [ x"$temp" != x"" ]; then
    echo "$place:$name wget -U '$meinfo' -q -O $out/$temp $url"
    [ -e $dir"/parse_$name.js" ] && echo "node $dir/parse_$name.js $out/$temp $value $labstr"
  else
    echo "$place:$name wget -T40 -U '$meinfo' -q -O $out/$file $url"
  fi
fi
if [ x"$dry" = x"" ]; then
	if [ x"$temp" != x"" ]; then
	  wget -T10 --tries=1 -U "$meinfo" -q -O $out/$temp $url
	  [ -e $dir"/parse_$name.js" ] && node --trace-deprecation $dir"/parse_$name.js" $out/$temp $value $labstr
    x=`cat $out/last.txt|awk 'match($1, /[0-9][0-9][0-9][0-9]/){print;}'|wc -l`
    if [ $x -gt 0 ]; then
      tail -6 $out/last.txt|awk 'match($1, /[0-9][0-9][0-9][0-9]/){print;}' > $out/last.tmp.txt;
      mv $out/last.tmp.txt $out/last.txt;
    fi
	  #rm -f $out"/"$temp
	else
	  wget -T10 --tries=1 -U "$meinfo" -q -O $out/$file $url
    x=`cat $out/$file|awk 'match($1, /[0-9][0-9][0-9][0-9]/){print;}'|wc -l`
    if [ $x -gt 0 ]; then tail -6 $out/$file|awk 'match($1, /[0-9][0-9][0-9][0-9]/){print;}' > $out/last.txt; fi
	fi
fi
done
)
done
)

exit 0
