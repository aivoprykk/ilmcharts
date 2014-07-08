#!/bin/bash
PATH=$PATH:/usr/local/bin
lab=0
force=0
test=0
dry=""
last=""
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
        esac
        shift
done
(
cd $path

date=`date '+%F'`
min=`date '+%H:%M'`;

i=0
cat $path/places.conf|grep -v '^#'|while read j; do
#for j in "${places[@]}"; do

IFS=:
set $j
place=$1
title=$2
wg=$3
yr=$4
emhi=$5
IFS=' '

(
cd public
#echo $place":"$title;
[ $test -eq 0 ] || continue;
[ x"$place" = x"" ] && continue;
if [ x"$emhi" != x"" ]; then
emhi_url='http://www.ilmateenistus.ee/meri/vaatlusandmed/'$emhi'/10-minuti-andmed/';
emhi_out="emhi_data/"$place
emhi_temp="arc-file-$place.html"
emhi_file="ARC-"$date".txt"

[ -d "$emhi_out" ] || mkdir -p "$emhi_out"

if [ -f $emhi_out/$emhi_file ]; then
last_stamp=`cat $emhi_out/$emhi_file|tail -1|awk '{ sub("([0-9][0-9][0-9][0-9])","&-",$1);sub("-([0-9][0-9])","&-"); print " " $1 " " $2 }'`
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
  [ $h -ne 1 -a $m -ge 0 -a $m -lt 11 ] && {
    if [ $lab -gt 0 ]; then
      echo "minuteid vahem kui 11: $min > $last_stamp";
    fi
    [ $force -eq 0 ] && exit;
  }
  [ $h -eq 0 -a $m -eq 11 ] && {
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
  echo "wget -q -O '$emhi_out/$emhi_temp' '$emhi_url' at `date '+%F %T'`"
fi
if [ x"$dry" = x"" ]; then
  wget -q -O "$emhi_out/$emhi_temp" "$emhi_url"
  node $dir"/parse_emhi.js" $emhi_out/$emhi_temp
  rm -f $emhi_out"/"$emhi_temp
fi
fi
)
done
)

exit 0
