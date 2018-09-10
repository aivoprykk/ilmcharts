<?php
/*
// Kasutada saab käsurealt:
// php zoig-archive-gen.php [[aeg|koik]|jaam]
// aeg on kas mysql ajastring või "koik",
// viimasel juhul genereeritakse kogu baasist failidesse arhiiv
// jaam - kui mingi muu jaam kui konfis kirjas

// Aga võib ka brauseris:
// http://localhost/zoig-archive-gen.php?aeg=2013-05-25 15:40:12&raam="2 0:5" DAY_MINUTE

// Näiteid:
// # php zoig-archive-gen.php
// viimase päeva andmed või misiganes vahemik konfis on antud

// # php zoig-archive-gen.php raam='"2 0:5" DAY_MINUTE'
// võtab kahe päeva andmed baasist, vaatab vastavate kuup
// failid üle ja kui leiab uuemaid kirjeid, siis lisab lõppu.

// # php zoig-archive-gen.php aeg="2013-05-25 15:40:12"
// mingi kindla päeva andmete genereerimine

// # php zoig-archive-gen.php aeg="2013-05-25 15:40:12" raam='"2 0:5" DAY_MINUTE' jaam=vortsjarv
// mitu asja kokku pandud
// jaamad tuleb vastavalt baasile paika ajada

// võiks ka ilma nimedeta töötada:
// # php zoig-archive-gen.php "2013-05-25 15:40:12" '"2 0:5" DAY_MINUTE'
*/

session_start();
$sql = "";
require("jaamconf.php");
header("Content-Type:text/plain");

//* mitmed konfi asjad siin
$jaamad = array('vortsjarv_tamme','vortsjarv_joesuu','peipsi_nina');
$sisendjaam = "";
$sisendaeg = 0;
$ajaraam = "";
$verbose = 0;
$komakohti = 1;
//* vajalikud sekundid mis lisatakse viimasele
//* failist leitud (minutiteni alla ümardatud) ajastringile
$puhveraeg = (20+60*5);
//* kui skript on bin kataloogis, siis kuhu võiks teha kataloogid ja failid?
//* praegu on tee $PWD/../public/, aga võib ka html vms
$bindir = "/bin";
$htmldir = "/public";

if(isset($argv)){
	foreach ($argv as $arg) {
		if($arg == 'lab'||$arg == 'debug') { $verbose=1; continue; }
		$e=explode("=",$arg);
		if(count($e)==2) $_GET[$e[0]]=$e[1];
		else $_GET[$e[0]]=0;
    }
}

foreach($_GET as $get=>$val){
	$tmp = "";
	if ($get == '-h' || $get == '-help' || $get == 'help') {
		usage();
	}
	else if ($get == 'verbose'||$get == '-v'||$get == '-verbose') {
		$verbose = 1;
	}
	else if ($sisendaeg == 0 && ($get=="aeg" || preg_match("/^(koik|\d*-\d*-\d*)/", $get))) {
		$tmp = ($get=="aeg") ? $_GET["aeg"] : $get;
		if($tmp) $sisendaeg = $tmp;
	}
	else if ($ajaraam == "" && ($get == "raam" || (preg_match("/^[\"\d\: ]+( (HOUR|DAY|MONTH|YEAR))?/", $get)))) {
		$ajaraam = ($get=="raam") ? $_GET[$get] : $get;
		if(is_numeric($ajaraam)) $ajaraam .= ' HOUR';
	}
	else if ($sisendjaam == "" && ($get == "jaam" || $tmp = array_search($get, $jaamad))) {
		$sisendjaam = ($get=="jaam") ? $_GET[$get] : $tmp;
	}
}

if(!$verbose) error_reporting(E_ALL ^ E_WARNING);

chdir(normalizeDir($bindir, $htmldir));
//echo getcwd();
//echo $sisendaeg."\n";

//* Kui sisendjaam määrata, siis teisi jaamu ignoreerib.
// if(!$sisendjaam){ $sisendjaam = 2; }

//* Selle võiks sisse panna siis, kui esimene kord on ajalugu genereeritud
//* ja vaja panna cronskriptiga uusi andmeid genereerima
//$ajaraam = '4 HOUR';

//if(!$sisendaeg) $sisendaeg = '2013-05-25 15:40:12';
if(!$sisendaeg) $sisendaeg = date("Y-m-d H:i:s");

//* Iga jaama jaoks praegu tehakse oma kataloog ja seal kuupäeva järgi failid.
//* arhiivikataloog on ./arhiiv/<jaam>/ARC-<kuup>.txt
$archivePath = "arhiiv";
$filePre = "ARC-";

// ajaraamile vastava sql filtri tegemine
$aeg="";
if($sisendaeg!='koik'){
	preg_match("/^((\d*)-(\d*)-(\d*)) (\d*):(\d*):\d*/", $sisendaeg, $mc);
	if(!$mc[5]) { echo "Ajastring peab olema kujul YYYY-MM-DD HH:MM:SS\n"; exit(1); }
	if($ajaraam){
		if(stripos($ajaraam," DAY") !== FALSE){
			$time = date("Y-m-d H:i:s", mktime(0, 0, 0, $mc[3], $mc[4]+1, $mc[2]));
		} else if(stripos($ajaraam," MONTH") !== FALSE){
			$time = date("Y-m-d H:i:s", mktime(0, 0, 0, $mc[3]+1, $mc[4], $mc[2]));
		} else if(stripos($ajaraam," YEAR") !== FALSE){
			$time = date("Y-m-d H:i:s", mktime(0, 0, 0, $mc[3], $mc[4], $mc[2]+1));
		} else {
			$time = date("Y-m-d H:i:s", mktime($mc[6], $mc[5]+1, 0, $mc[3], $mc[4], $mc[2]));
		}
		$aeg = ' AND time BETWEEN DATE_SUB("'.$time.'",INTERVAL '.$ajaraam.') AND "'.$time.'"';
	} else {
		$time = date("Y-m-d H:i:s", mktime(0, 0, 0, $mc[3], $mc[4]+1, $mc[2]));
		$aeg = ' AND time BETWEEN DATE_SUB("'.$time.'",INTERVAL "1 0:5" DAY_MINUTE) AND "'.$time.'"';
	}
}

if($verbose){
	echo "Sisendaeg: ".$sisendaeg."\n";
	echo "Ajaraam: ".$ajaraam."\n";
}

// Umbes nii toimetab:
// 1. baasist info mingi aja kirjete kohta
// 2. kuupäeva muutumisel vastava kuup viimane ajastring failist
// 3. baasi kirjete ümardamine 5min keskmisele
// 4. kuupäeva muutumisel ja lõpus uued read faili

if(!$sql){
	$mysqli = mysqli_connect($host, $user, $password, $database);
	if (mysqli_connect_errno()) {
		printf("Connect failed: %s\n", mysqli_connect_error());
		exit();
	}
}

$fieldnames = array("temperature", "heat_index", "dewpoint", "wind_direction", "wind_speed", "wind_gust", "humidity", "pressure");
$fstr = join(", ",$fieldnames);
for($k=0,$l=count($jaamad);$k<$l;++$k){
	if($sisendjaam!=FALSE && $k!=$sisendjaam) continue;
	$jaam=$k;
	$jaamastr = $jaamad[$jaam];
	if($jaamastr=='vortsjarv_tamme') $jstr="TammeSurf";
	else if($jaamastr=='vortsjarv_joesuu') $jstr="Joesuu";
	else if($jaamastr=='peipsi_nina') $jstr="MobileSurf";
	else $jstr = $jaam;
	$query = "select time, $fstr from wsds where station_id='$jstr'$aeg order by time asc";
	//$query = "select aeg, ti, ilm.to as 'to', hi, ho, dp, wc, ws, wd, rt, r1, r24, pr, pa, wf, wt, ccalt, wg from ilm where jaam=$jaam$aeg order by aeg asc";
	if($verbose) { echo $query."\n"; }
	//siin mysqli eripärad
	if(!$sql) {
		if(!$result = $mysqli->query($query)) {
			die('Päringu viga [' . $mysqli->error . ']');
		}
		$result->data_seek(0);
		$count = $result->num_rows;
	} else {
		$sql->Query($query);
		$count = $sql->rows;
	}
	if($verbose) { echo "$jaamastr akohta leiti $count rida.\n"; }
	$lastpath = $archivePath.DIRECTORY_SEPARATOR.$jaamastr.DIRECTORY_SEPARATOR."last.txt";

	$fields = array();
	$fields_count = 0;
	while ($finfo = $result->fetch_field()) {
        $fields[$fields_count]=$finfo->name;
        ++$fields_count;
    }
	$rownum = 0;
	$laststamp = 0;
	$nowstamp = 0;
	$data = "";
	$fdata = "";
	$tdata = array();
	$curdate = "";
	$d = "";
	$path = "";
	$flush = FALSE;
	$nowminute = "";
	$prevminute = "";
	$nowdate = "";
	$prevdate = "";
	$rowscount = 0;
	//$lastdata = "";
	for($o=0;$o<$count;++$o){
		if($sql) {
			$sql->Fetch($o);
			$row = $sql->data;
		}
		else{
			$row = $result->fetch_row();
		}


		$rownum++;
		$rowdata = "";
		$nowdatestr = "";
		$datechanged = FALSE;
		$nowtime = "";
		$prevtime = "";
		//rea kuup unix timestamp, samuti faili jaoks ajastring

		if(count($tdata)){
			preg_match("/^((\d*)-(\d*)-(\d*)) (\d*:(\d*)):\d*/", $tdata[0], $mc);
			$prevdate = $mc[1];
			$prevtime = $mc[5];
			$prevminute = $mc[6];
		}
		// võtab välja kuup ja minutid mysql datetime väljalt
		preg_match("/((\d*)-(\d*)-(\d*)) (\d*:(\d*)):\d*/", $row[0], $mc);
		$nowtime = $mc[5];
		if($nowdate!=$mc[1]){
			$nowdate = $mc[1];
			$datechanged=TRUE;
		}
		$nowminute = $mc[6];
		$nowdatestr = $mc[2].$mc[3].$mc[4]." ".$mc[5];
		$nowstamp = strtotime($row[0]);

		$delta = abs($nowminute-$prevminute);
		$flush = ($prevminute!="" && testm($nowminute) && (!testm($prevminute) || $delta>4)) ? ($flush ? 2 : 1) : FALSE;
		if($flush==2 && $delta>4) $flush=1;
		if($verbose) {
			echo "Kas flushida ? $prevdate:$prevminute:$nowdate:$nowminute:$flush:$delta\n";
			echo "testid:".testm($nowminute).":".testm($prevminute).":".$prevminute."\n";
		}
		//* kuup vahetusel otsib uue nimega failist viimast ajastringi
		if($datechanged){
			$prevpath = $path;
			$path = $archivePath.DIRECTORY_SEPARATOR.$jaamastr.DIRECTORY_SEPARATOR.$filePre.$nowdate.".txt";
			$laststamp = getLastStamp($path);
			if(!$laststamp) $laststamp = 0;
			if($verbose) { echo "Viimane ajastring failist $path on $laststamp\n"; }
		}
		//* väljade läbihekseldamine
		for ($i=0,$j=count($row); $i<$j;++$i){
			if($flush && $flush != 2){
				// 0/5/10 tiksus täis, nüüd arvutused välja kupa
				// kui viie või kümnega lõppev minut saabub, siis salvestab keskmised ja nullib loenduri;
				// lisab faili minevasse stringi välja kaupa rea, tabulatsiooniga on väljad eristatavad
				//echo $i. " ";
				//print_r($tdata[$i]);
				if(($laststamp+$puhveraeg)>=$nowstamp){
					unset($tdata[$i]);
				}
        		//$query = "select aeg, ti, ilm.to as 'to', hi, ho, dp, wc, ws, wd, rt, r1, r24, pr, pa, wf, wt, ccalt, wg from ilm where jaam=$jaam$aeg order by aeg asc";
				//$fieldnames = array("temperature", "heat_index", "dewpoint", "wind_direction", "wind_speed", "wind_gust", "humidity", "pressure");

				else if($i==0) {
					$rowdata = $nowdatestr; // see on hüpoteetiline minuti vaheldumise string
				}
				else if(is_array($tdata[$i])){
					if($verbose) { echo "Välja [".$i."] vaartuste jada: ".array_sum($tdata[$i])."\n"; }
					if($i==4) { #wind_dir
						$rowdata .= "\t" . wdAvg($tdata[4],$tdata[5]);
					}
					else if($i==5) { #wind_speed
						$rowdata .= "\t" . sMean($tdata[5]);
					}
					//jada keskmine
					else if($i!=6) { #teised, keskmine
						$rowdata .= "\t" . sMean($tdata[$i]);
					}
					//puhangute puhul max
					else { #wind_gust
						$rowdata .= "\t" . max($tdata[$i]);
					}
					// nullib lugeri
					unset($tdata[$i]);
				} else {
					$rowdata .= "\t" . ($i==4 || $i==5 ? 0 : $tdata[$i]);
					if($verbose) { echo "Väli[".$i."]: ".$tdata[$i]."\n"; }
				}
			}
			if($i>0 && is_numeric($row[$i])) $tdata[$i][] = $row[$i];
			else $tdata[$i] = $row[$i];
		}
		if($rowdata) {
			if($verbose) {echo "row $rowdata $laststamp+$puhveraeg>=$nowstamp (".$row[0].")\n";}
			$data .= $rowdata."\n";
			++$rowscount;
			/*if($i>$j-5) {
				$lastdata .= $rowdata."\n";
			}*/
		}
		if(($nowtime == '23:55' && $prevtime && $prevtime != '23:55') || $rownum == $count) {
			//kuupäeva vahetusel või viimasel real salvestatakse andmestring faili
			if($path&&$data){
				if($verbose) { echo "Kirjutame leitud andmed ($rowscount rida) faili $path\n"; }
				if($laststamp==0) {
					$data = "time\t".join("\t",$fieldnames) . "\n" . $data;
				}
				addContent($path, $data);
				$data = "";
				$rowscount = 0;
			}
		}
	}
	if($verbose) { echo "Parsiti $rownum rida.\n"; }
	//addContent($lastpath, $lastdata, 'w');
	wrapLastRows($path, $lastpath);
	if(!$sql) $result->close();
}
if(!$sql) $mysqli->close();

//* harmooniline keskmine
function hMean($arg) {
	$count=count($arg);
	$avs=0;
	$datas = 0;
	for($i=0;$i<$count;++$i) {
		if($arg[$i]) {
			$avs += (1/$arg[$i]);
			++$datas;
		}
	}
	$c = ($datas/$avs);
	return $c ? sprintf("%.1f",$c) : 0;
}
//* aritmeetiline keskmine
function sMean($arg){
	$c = (array_sum($arg)/count($arg));
	return $c ? sprintf("%.1f", $c) : 0;
}
//* vektoriaalne keskmine, tuule tugevuse komponent ka sees
function wdAvg($wd, $ws = array()){
	$sins = 0;
	$coss = 0;
	$count = count($wd);
	$num = $count;
	for($i=0;$i<$count;++$i) {
		if (!$wd[$i]){
			--$num;
			continue;
		}
		$sins += ($ws[$i] ? $ws[$i] : 1) * sin($wd[$i]*pi()/180);
		$coss += ($ws[$i] ? $ws[$i] : 1) * cos($wd[$i]*pi()/180);
	}
	$as = (-1*(1/$num)*$sins);
	$ac = (-1*(1/$num)*$coss);
	if($as==0){
		if($ac < 0) $c = 0;
		else if($ac > 0) $c = 180;
		else $c = 0;
	} else{
		$c = 90 - (atan($ac/$as)*180/pi());
		if($as > 0) $c += 180;
	}
	//$c = ($c<180) ? ($c+180) : ($c-180);
	//if($c<0) $c+=180;
	//if($c>89.9 && $c<180) $c += 180;
	//else if($c > 179.9) $c -= 180;
	return $c ? sprintf("%.1f", $c) : 0;
}
// üritab bin kataloogi $htmldir seadega asendada
function normalizeDir($bindir, $htmldir) {
	return dirname(str_replace($bindir, $htmldir, __FILE__));
}
//* viimase ajatempli leidmine failist
function getLastStamp($path){
	$df=0;
	if(file_exists($path)) {
		$handle       = fopen($path, "r");
		$fileContents = fread($handle, filesize($path));
		fclose($handle);
		$rows = explode("\n",$fileContents);
		$count = count($rows);
		if($count<=0) return 0;
		$tmp = "";
		$i=$count;
		while(!$tmp&&$i){
			--$i;
			$last = $rows[$i];
			$fields = explode("\t",$last);
			$tmp = $fields[0];
		}
		//echo $df."\n";
		if($tmp) $df = strtotime(preg_replace("/(\d{4})-?(\d{2})-?(\d{2}) (.*)/","$1-$2-$3 $4:00",$tmp));
	}
	return $df;
}

function wrapLastRows($big, $path){
	$df=0;
	if(file_exists($big)) {
		//echo "fail:".$path."\n";
		$handle       = fopen($big, "r");
		$fileContents = fread($handle, filesize($big));
		fclose($handle);
		$rows = explode("\n",$fileContents);
		$count = count($rows);
		if($count<6) return 0;
		$tmp = "";
		$i=$count-6;
		if($i<0) $i=0;
		while($i<$count-1){
			++$i;
			//echo "rida:".$rows[$i]."\n";
			if(preg_match("/^\d{6}/", $rows[$i])) $tmp .= $rows[$i]."\n";
		}
		if($tmp) {
			addContent($path, $tmp, 'w');
		}
	}
}
//* rekursiivne kataloogide loomine
function mkdirp($path, $mode = 0777) {
    $dirs = explode(DIRECTORY_SEPARATOR , $path);
    $count = count($dirs);
    $path = '.';
    for ($i = 0; $i < $count; ++$i) {
        $path .= DIRECTORY_SEPARATOR . $dirs[$i];
        if (!is_dir($path) && !mkdir($path, $mode)) {
            return FALSE;
        }
    }
    return TRUE;
}
//* datastringi faili lisamine
function addContent($path,$data,$mode='a'){
	if(!$data) return FALSE;
	$dir = dirname($path);
	mkdirp($dir);
	if (!file_exists($dir)) {
		echo "Directory ($dir) not exist.\n";
		return FALSE;
	}
	if (!$handle = fopen($path, $mode)) {
		 echo "Cannot open file ($path).\n";
		 return FALSE;
	}
	if (fwrite($handle, $data) === FALSE) {
		echo "Cannot write to file ($path).\n";
		return FALSE;
	}
	fclose($handle);
	return TRUE;
}
//* 0/5/10 minuti test
function testm($m){
	//if(!$m) return FALSE;
	return ($m % 5 == 0 || $m % 10 == 0 || $m == 0);
}
//* kasutusjuhend
function usage(){
	echo "Kasutus: ".basename(__FILE__)." [aeg=]<mysqldatetime|koik> [[jaam=]jaam] [[raam=]raam]\n\n";
	echo " raam - ajaraam mysql interval ala '\"1 0:5\" DAY_MINUTE'\n";
	echo " aeg - mysql string ala '2013-05-25 15:40:12'\n";
	echo " jaam - jaama nimi\n\n";
	exit(0);
}

?>
