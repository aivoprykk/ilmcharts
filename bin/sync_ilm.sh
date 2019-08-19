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
(
cd "$ldir";
rsync -a$dry$kstr$estr root@$host:"$dir/public/"*_data "$ldir/public/"
rsync -a$dry$kstr$est root@$host:"$dir/public/"arhiiv "$ldir/public/"
rsync -a$hdry$kstr$estr "$ldir/public"/*_data $ldir/public/arhiiv root@$host:"$dir/public/"
bash bin/manage_old_data.sh
)