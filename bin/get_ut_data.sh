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
place=tartu
#http://meteo.physic.ut.ee/et/archive.php?do=data&begin%5Byear%5D=2015&begin%5Bmon%5D=2&begin%5Bmday%5D=15&end%5Byear%5D=2015&end%5Bmon%5D=2&end%5Bmday%5D=16&9=1&12=1&10=1&15=1&16=1&ok=+Esita+p%C3%A4ring+
	url='http://meteo.physic.ut.ee/et/archive.php?do=data';
	url="$url&`date '+begin[year]=%Y&begin[mon]=%m&begin[mday]=%d'`"
	url="$url&`date --date='tomorrow' '+end[year]=%Y&end[mon]=%m&end[mday]=%d'`"
	url="$url&9=1&12=1&10=1&15=1&16=1&ok=+Esita+p%C3%A4ring"
	out="ut_data/"$place
ut_file="ARC-"$date".txt"

[ -d "$out" ] || mkdir -p "$out"

if [ -f $out/$ut_file ]; then
last_stamp=`cat $out/$ut_file|tail -1|awk 'match($1,/[0-9][0-9][0-9][0-9][0-9]/){sub("([0-9][0-9][0-9][0-9])","&-",$1);sub("-([0-9][0-9])","&-",$1) }match($2,/[0-9][0-9]:[0-9][0-9]:[0-9]/){$2=substr($2,1,5)}{ sub(",","",$2); print " " $1 " " $2 }'`
last_min=`echo $last_stamp|awk 'match($2, /[0-9][0-9]:[0-9][0-9]:[0-9]/){sub(":[0-9][0-9]","",$2);sub("^0","",$2);print $2}';`
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
  echo "wget -U 'WG' -q -O $out/$ut_file $url at `date '+%F %T'`"
fi
if [ x"$dry" = x"" ]; then
  wget -U 'Wget for ilm.majasa.ee/' -q -O $out/$ut_file $url
fi
)
)

exit 0
