#!/bin/bash

lab=0
force=0;
[ x$1 != x ] && [ $1 = force ] && { force=1; lab=1; }
[ x$1 != x ] && [ $1 = lab ] && lab=1

path=`dirname $0`/public
(

cd $path

date=`date '+%F'`
min=`date '+%H:%M'`;

emu_url="http://energia.emu.ee/weather/Archive/";
emu_out=emu_data
emu_file="ARC-"$date".txt"

[ -d $path/$emu_out ] || mkdir $path/$emu_out

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
    exit;
  }
  [ $m -eq 5 ] && {
    s=`date '+%S'`
    w=8
    if [ $s -lt $w ]; then
      let 's=w-s'
      sleep $s
    fi 
  } 
}  
fi

if [ $lab -gt 0 ]; then
  echo "wget -U 'WG' -q -O $emu_out/$emu_file $emu_url$emu_file at `date '+%F %T'`"
fi
wget -U 'Wget for ilm.majasa.ee/tartu/app2/' -q -O $emu_out/$emu_file $emu_url$emu_file

)

exit 0
