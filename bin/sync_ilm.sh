[ x"$DRY" != x"" ] && dry='nv'
[ x"$1" != x"" ] && { host="$1"; }
[ x"$host"=x"" ] && [ x"$HOST" != x"" ] && { host="$HOST"; }
[ x"$host"=x"" ] || exit
[ x"$2" != x"" ] && [ -d "$2" ] && { dir="$2"; }
[ x"$dir"=x"" ] && [ x"$DIR" != x"" ] && { dir="$DIR"; }
[ x"$dir"!=x ] && [ -d "$dir" ] || exit
[ x"$3" != x"" ] && [ -f "$3" ] && { key="$3"; } || exit
(
cd $dir;
rsync -a -e "ssh -i $key" root@$host:$PWD/public/*_data public/
rsync -a -e "ssh -i $key" root@$host:$PWD/public/arhiiv public/
rsync -a$dry -e "ssh -i $key" public/*_data public/arhiiv root@$host:$PWD/public/
bash bin/manage_old_data.sh
);
