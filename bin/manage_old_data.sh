days=520
[ x"$1" != x"" ] && days=$1
dir=`dirname $0`
echo "$dir" | grep -q '^/' || dir=`pwd`/$dir
path=`echo "$dir"|sed -e 's/\/\?bin//'`
[ x"$path" = x"" ] && path="." || path=$path
[ -d $path ] || { echo $path not found; exit; }
mask2='~[1-9][0-9]?[0-9]~'
for i in $path/public/*data; do
find $i -type f -mtime +$days -exec rm '{}' ';';
done
for i in $path/public/{wg,yr}_data; do
find $i -type f -regex '.*'$mask2 -exec rm '{}' ';';
done
