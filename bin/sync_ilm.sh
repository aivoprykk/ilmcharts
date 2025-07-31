#!/bin/bash

[ x"$DRY" != x"" ] && dry='nv' && hdry='nv'
[ x"$HDRY" != x"" ] && hdry='nv' && dry=v
[ x"$1" != x"" ] && { host="$1"; }
[ x"$host" = x"" ] && [ x"$HOST" != x"" ] && { host="$HOST"; }
[ x"$host" != x"" ] || exit
[ x"$2" != x"" ] && [ -d "$2" ] && { dir="$2"; }
[ x"$dir" = x"" ] && [ x"$DIR" != x"" ] && { dir="$DIR"; }
[ x"$dir" != x"" ] || exit
[ x"$3" != x"" ] && [ -f "$3" ] && { key="$3"; }
[ x"$key" = x"" ] && [ x"$KEY" != x"" ] && { key="$KEY"; }
[ x"$key" != x"" ] && [ -f "$key" ] && { kstr=" -e 'ssh -i $key'"; }
[ x"$EXCL" != x"" ] && { estr=" --exclude-from=$EXCL"; }
ldir="$dir"
[ x"$LDIR" != x"" ] && { ldir="$LDIR"; }
[ -d "$ldir" ] || { ldir=.; }
side='from'
[ x"$SIDE" != x"" ] && { side="$SIDE"; }
(
cd "$ldir";
if [ x"$side" = x"from" -o x"$side" = x"both" ]; then
dirs=$(ssh -A root@$host 'ls -d '$dir'/public/arhiiv '$dir'/public/*_data*|grep -v _old')
for d in $dirs; do
b=$(basename "$d")
rsync -a$dry$kstr$estr root@$host:"$d"/ "$ldir/public/$b/"
done
fi
if [ x"$side" = x"to" -o x"$side" = x"both" ]; then
dirs=$(ls -d $ldir/public/arhiiv $ldir/public/*_data*|grep -v _old)
for d in $dirs; do
b=$(basename "$d")
rsync -a$hdry$kstr$estr "$d"/ root@$host:"$dir/public/$b/"
done
fi
bash bin/manage_old_data.sh
)