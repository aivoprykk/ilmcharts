#!/bin/bash

lab=0
force=0
test=0
dry=""
last=""
station=""
temp=""
dir=`dirname $0`
echo "$dir" | grep -q '^/' || dir=`pwd`/$dir
path=`echo "$dir"|sed -e 's/\/\?bin//'`
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
minutes=5
i=0
cat $path/places.conf|grep -v '^#'|while read j; do

IFS=:
set $j
place=$1
title=$2
names="wg:$3 yr:$4 emhi:$5 mnt:$6 zoig:$7 emu:$8";
IFS=' '
(
cd public
[ $test -eq 0 ] || continue;
[ x"$place" = x"" ] && continue;
for x in $names; do
name=${x/:*/};
value=${x/*:/};

#echo "$place $name $value";
[ x"$value" = x"" ] && continue;
#continue;
[ x"$station" != x"" -a "$name" != "$station" ] && continue;

case "$name" in
emu)
	url="http://energia.emu.ee/weather/Archive/";
	out=emu_data/$place
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
	continue;
	;;
mnt)
	url='http://www.balticroads.net/?getstationdata=1&mapstation='$value
	out="mnt_data/"$place
	temp="arc-file-$place.html"
	minutes=11
	continue;
	;;
*)
	continue;
	;;
esac
file="ARC-"$date".txt"

[ -d "$out" ] || mkdir -p "$out"

if [ -f $out/$file ]; then
last_stamp=`cat $out/$file|tail -1|awk '{ sub("([0-9][0-9][0-9][0-9])","&-",$1);sub("-([0-9][0-9])","&-"); print " " $1 " " $2 }'`
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
      echo "minuteid vahem kui $minutes: $min > $last_stamp";
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

if [ $lab -gt 0 ]; then
  echo "wget -U 'WG' -q -O $out/$file $url$file at `date '+%F %T'`"
fi
if [ x"$dry" = x"" ]; then
	if [ x"$temp" != x"" ]; then
	  wget -U 'Wget for ilm.majasa.ee/' -q -O $out/$temp $url$file
	  node $dir"/parse_$name.js" $out/$temp
	  rm -f $out"/"$temp
	else
	  wget -U 'Wget for ilm.majasa.ee/' -q -O $out/$file $url$file		
	fi
fi
done
)
done
)

exit 0
