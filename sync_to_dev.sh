l='-av'
if [ x$DRY != x ]; then
 l="$l"n
fi
host='10.10.19.61'
if [ x$1 != x ]; then
	 host="$1"
fi
pth=$(dirname $0)
topth=/var/www/ilm/prod/ilmcharts
(
cd $pth;
rsync $l --no-links --exclude='public/*data' --exclude='public/arhiiv*' --exclude='*lock.json' --exclude='.git' --exclude='.DS*' --exclude='._*' --exclude=node_modules . root@$host:$topth/;
#if [ x"$DRY" = x"" ]; then
#ssh -A root@$host 'cd '$topth'; grunt dist';
#fi
)
