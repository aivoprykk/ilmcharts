Ilmcharts
=========

A small app for graph weather station(s) datasets.

Uses javascript plotting, thanks to http://highcharts.com/.

###Usage:

1) Download git to webserver directory:
```
git clone https://github.com/aivoprykk/ilmcharts.git
cd ilmcharts
```

2) Fetch data source. Default there are 2 shellscripts for fetching weather data:
```
get_data.sh - fetch forecast data from yr.no and windguru.cz
get_emu_data.sh - fetch latest data from weather station(s), currently text files from weather.emu ee
```
Modify shellscripts to meet your needs and set up cron:
```
EDITOR=vi crontab -e
#*/12 * * * * /bin/bash /var/www/get_data.sh
#*/10 * * * * /bin/bash /var/www/get_emu_data.sh
```

3) Hardest part is consuming data source, you need to make own normalizeData implementation to shape input source data for highcharts data array. ilm.js has 2 examples: for json and for text file data.

4) Browse app from webserver, when graphs are filled it's working.

This project is licensed under the terms of the GPL license.

Have a good weather! 
