#!/bin/bash

lab=0
force=0;
[ x$1 != x ] && [ $1 = force ] && { force=1; lab=1; }
[ x$1 != x ] && [ $1 = lab ] && lab=1
path=`dirname $0`
(
cd $path;

rotate () {
  ext=$1
  dir=$2
  name=$3
  num=1
  base=${name/\.${ext}/}
  (
  cd $dir;
  [ -f ${name} ] || return 1;
  [ -f ${base}.001.${ext} ] && diff $name $base.001.$ext >/dev/null && return 2;
  ls -r *.*.${ext}|while read a; do
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
    if [ $num -gt 110 ]; then continue; fi
    d=`printf "%03d" $d`;
  if [ $lab -gt 0 ]; then
    echo "cp -f ${a} ${b}.${d}.$ext"
  fi
    cp -f $a $b.${d}.${ext};
  done
  if [ $lab -gt 0 ]; then
    echo "cp -f ${name} $base.001.$ext"
  fi
  cp -f ${name} $base.001.$ext;
  )
  return 0;
}

yr_time () {
#<nextupdate>2013-05-13T19:00:00</nextupdate>
dir=$1
file=$2
grep nextupdate ${dir}/${file} | perl -MTime::Local -ne '
$ltime=$time=time;
if(/<nextupdate>/) {
s/^.*<nextupdate>([^\<]+)<.*$/$1/;
if(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/){
$year=$1;$month=$2;$mday=$3;$hour=$4;$min=$5;$sec=$6;
$ltime=timelocal($sec,$min,$hour,$mday,$month-1,$year-1900);
print $ltime - $time;
exit 0;
}
}
print 0;
'
}

wg_time () {
#Mon, 13 May 2013 16:55:00 +0000
dir=$1
file=$2
grep update_next ${dir}/${file} | perl -MTime::Local -ne '
$gmtime=$time=time;
%months=("Jan"=>1,"Feb"=>2,"Mar"=>3,"Apr"=>4,"May"=>5,"Jun"=>6,"Jul"=>7,"Aug"=>8,"Sep"=>9,"Oct"=>10,"Nov"=>11,"Dec"=>12);
if(/update_next/) {
s/^.*update_next":"([^\"]+)".*$/$1/;
if(/^\w+, (\d{2}) (\w+) (\d{4}) (\d{2}):(\d{2}):(\d{2})/){
$year=$3;$month=$months{$2};$mday=$1;$hour=$4;$min=$5;$sec=$6;
$gmtime=timegm($sec,$min,$hour,$mday,$month-1,$year-1900);
print $gmtime - $time;
exit 0;
}
}
print 0;
'
}

#wguru
wg_file=windguru_forecast.json
wg_dir=wg_data/tabivere
wg_url='http://www.windguru.cz/int/widget_json.php?callback=wg_data&lng=ee&s=266923&params=[WINDSPD,GUST,MWINDSPD,SMER,TMPE,TCDC,APCPs]&odh=0&doh=24&fhours=72&wj=msd&tj=c&waj=m&lng=ee'
[ x"${wg_dir}" != x"" ] && [ -d "${wg_dir}" ] && mkdir -p "${wg_dir}"
if [ -e ${wg_dir}/${wg_file} ]; then
  wg_t=`wg_time ${wg_dir} ${wg_file}`;
else
  wg_t=-1
fi
if [ $lab -gt 0 ]; then
  echo "windguru secs "$wg_t
fi
if [ $force -gt 0 -o $wg_t -lt 0 ]; then

  rotate json ${wg_dir} ${wg_file}
  if [ $lab -gt 0 ]; then
    echo wget -q -O ${wg_dir}/${wg_file}.tmp "${wg_url}"
  fi
  wget -q -O ${wg_dir}/${wg_file}.tmp "${wg_url}"
  if [ $lab -gt 0 ]; then
    printf "next update time: "
    wg_time ${wg_dir} ${wg_file}.tmp
    echo
  fi
  if [ -f ${wg_dir}/${wg_file}.tmp ]; then
    if [ `wg_time ${wg_dir} ${wg_file}.tmp` -gt 0 ]; then
      cp -f ${wg_dir}/${wg_file}.tmp ${wg_dir}/${wg_file}
      rm -f ${wg_dir}/${wg_file}.tmp
    fi
  fi

fi

#yr.no
yr_file=forecast_hour_by_hour.xml
yr_dir=yr_data/tabivere
#yr_url='http://www.yr.no/sted/Estland/Jõgevamaa/Tabivere~587488/forecast_hour_by_hour.xml'
yr_url='http://www.yr.no/sted/Estland/Jõgevamaa/Tabivere~587488/varsel_time_for_time.xml'
[ x"${yr_dir}" != x"" ] && [ -d "${yr_dir}" ] && mkdir -p "${yr_dir}"

if [ -e ${yr_dir}/${yr_file} ]; then
  yr_t=`yr_time ${yr_dir} ${yr_file}`;
else
  yr_t=-1
fi

if [ $lab -gt 0 ]; then
  echo "yr.no secs "$yr_t
fi
if [ $force -gt 0 -o $yr_t -lt 0 ]; then

  rotate xml ${yr_dir} ${yr_file}
  if [ $lab -gt 0 ]; then
    echo wget -q -O ${yr_dir}/${yr_file}.tmp "${yr_url}"
  fi
  wget -q -O ${yr_dir}/${yr_file}.tmp "${yr_url}"
  if [ $lab -gt 0 ]; then
    printf "next update time: "
    yr_time ${yr_dir} ${yr_file}.tmp
    echo
  fi
  if [ -f ${yr_dir}/${yr_file}.tmp ]; then
    if [ `yr_time ${yr_dir} ${yr_file}.tmp` -gt 0 ]; then
      cp -f ${yr_dir}/${yr_file}.tmp ${yr_dir}/${yr_file}
      rm -f ${yr_dir}/${yr_file}.tmp
    fi
  fi
fi
)
