<?
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
$jaamad = array('vortsjarv','saadjarv','tartu1');
$sisendjaam = "";
$sisendaeg = 0;
$ajaraam = "";
$verbose = 0;
$komakohti = 1;
//* vajalikud sekundid mis lisatakse viimasele 
//* failist leitud (minutiteni alla ümardatud) ajastringile
$puhveraeg = 20;
//* kui skript on bin kataloogis, siis kuhu võiks teha kataloogid ja failid?
//* praegu on tee $PWD/../public/, aga võib ka html vms
$bindir = "/bin";
$htmldir = "/public";

if(isset($argv)){
	foreach ($argv as $arg) {
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
		$aeg = ' AND aeg BETWEEN DATE_SUB("'.$time.'",INTERVAL '.$ajaraam.') AND "'.$time.'"';
	} else {
		$time = date("Y-m-d H:i:s", mktime(0, 0, 0, $mc[3], $mc[4]+1, $mc[2]));
		$aeg = ' AND aeg BETWEEN DATE_SUB("'.$time.'",INTERVAL "1 0:5" DAY_MINUTE) AND "'.$time.'"';
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

for($k=0,$l=count($jaamad);$k<$l;++$k){
	if($sisendjaam!=FALSE && $k!=$sisendjaam) continue; 
	$jaam=$k;
	$jaamastr = $jaamad[$jaam];
	
	$query = "select aeg, ti, ilm.to as 'to', hi, ho, dp, wc, ws, wd, rt, r1, r24, pr, pa, wf, wt, ccalt, wg from ilm where jaam=$jaam$aeg order by aeg asc"; 
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
		$flush = ($prevminute && testm($nowminute) && !testm($prevminute)) ? ($flush ? 2 : 1) : FALSE;
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
				else if($i==0) {
					$rowdata = $nowdatestr; // see on hüpoteetiline minuti vaheldumise string
				}
				else if(is_array($tdata[$i])){
					if($i==7||$i==8) {
						if($i==7) {
							$rowdata .= "\t" . sMean($tdata[7]);
							$rowdata .= "\t" . wdAvg($tdata[8],$tdata[7]);
						}
						unset($tdata[$i]);
					}
					//jada keskmine
					else if($i!=17) {
						$rowdata .= "\t" . sMean($tdata[$i]);
					}
					//puhangute puhul max
					else {
						$rowdata .= "\t" . max($tdata[$i]);
					}
					// nullib lugeri
					unset($tdata[$i]);
				} else {
					$rowdata .= "\t" . $tdata[$i];
				}
			}
			if($i>0 && is_numeric($row[$i])) $tdata[$i][] = $row[$i];
			else $tdata[$i] = $row[$i];
		}
		if($rowdata) {
			if($verbose) {echo "row $rowdata $laststamp+$puhveraeg>=$nowstamp\n";}
			$data .= $rowdata."\n";
			++$rowscount;
		}
		if(($nowtime == '23:55' && $prevtime && $prevtime != '23:55') || $rownum == $count) {
			//kuupäeva vahetusel või viimasel real salvestatakse andmestring faili
			if($path&&$data){
				if($verbose) { echo "Kirjutame leitud andmed ($rowscount rida) faili $path\n"; }
				addContent($path, $data);
				$data = "";
				$rowscount = 0;
			}
		}
	}
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
	for($i=0;$i<$count;++$i) {
		$sins += ($ws[$i] ? $ws[$i] : 1) * sin(deg2rad($wd[$i]));
		$coss += ($ws[$i] ? $ws[$i] : 1) * cos(deg2rad($wd[$i]));
	}
	$c = rad2deg(atan((-(1/$count)*$sins)/(-(1/$count)*$coss)));
	$c = ($c<180) ? ($c+180) : ($c-180);
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
function addContent($path,$data){
	if(!$data) return FALSE;
	$dir = dirname($path);
	mkdirp($dir);
	if (!file_exists($dir)) {
		echo "Directory ($dir) not exist.\n";
		return FALSE;
	}
	if (!$handle = fopen($path, 'a')) {
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
	if(!$m) return FALSE;
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
