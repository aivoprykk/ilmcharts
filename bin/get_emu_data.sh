#!/bin/bash

lab=0
force=0
test=0
dry=""
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

(
cd public
[ $test -eq 0 ] || exit;

emu_url="http://energia.emu.ee/weather/Archive/";
emu_out=emu_data
emu_file="ARC-"$date".txt"

[ -d "$emu_out" ] || mkdir "$emu_out"

if [ -f $emu_out/$emu_file ]; then
last_stamp=`cat $emu_out/$emu_file|tail -1|awk '{ sub("([0-9][0-9][0-9][0-9])","&-",$1);sub("-([0-9][0-9])","&-"); print " " $1 " " $2 }'`
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
  [ $m -ge 0 -a $m -lt 5 ] && {
    if [ $lab -gt 0 ]; then
      echo "minuteid vahem kui viis: $min > $last_stamp";
    fi
    [ $force -eq 0 ] && exit;
  }
  [ $m -eq 5 ] && {
    s=`date '+%S'`
    w=8
    if [ $s -lt $w ]; then
      let 's=w-s'
      [ $force -eq 0 ] && sleep $s
    fi 
  } 
}  
fi

if [ $lab -gt 0 ]; then
  echo "wget -U 'WG' -q -O $emu_out/$emu_file $emu_url$emu_file at `date '+%F %T'`"
fi
if [ x"$dry" = x"" ]; then
  wget -U 'Wget for ilm.majasa.ee/' -q -O $emu_out/$emu_file $emu_url$emu_file
fi
)
)

exit 0
