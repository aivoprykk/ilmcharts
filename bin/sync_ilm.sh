[ x"$DRY" != x"" ] && dry='nv'
[ x"$1" != x"" ] && { host="$1"; } || exit
[ x"$2" != x"" ] && [ -d "$2" ] && { dir="$2"; } || exit
[ x"$3" != x"" ] && [ -f "$3" ] && { key="$3"; } || exit
(
cd $dir;
rsync -a -e "ssh -i $key" root@$host:$PWD/public/*_data public/
rsync -a$dry -e "ssh -i $key" public/*_data root@$host:$PWD/public/
);
