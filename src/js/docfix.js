(function (w) {
	var $ = w.$,
    d = document,
    e = d.documentElement,
    g = d.getElementsByTagName('body')[0],
	contid = 0;
	function fixCharts(width, fn) {
		$(fn).css("width", width);
		$(d).ready(function () {
				var inner = $(fn).width();
				setTimeout(function () {
					$.each(w.ilm.charts, function (i, obj) {
						obj.setSize($(fn).width() - 6, obj.containerHeight, false);
					});
				}, 500);
			});
	}
	function setWidth() {
		console.log(w.ilm.getWidth());
		var inner = ((w.ilm.getWidth() < 1024) ? "100" : "50") + "%";
		$('.float').each(function () {
			fixCharts(inner, this);
		});
	}
	w.ilm.popup="";
	w.ilm.Options = function(state){
		var t = this, f = $("#lingid"), g = $("#sl"), html = '', z = '';
		g.html("Seaded (klikk varjamiseks)");
		var getattr = function (base) {
			html = '';
			if (base) {
				for(var i in base) {
					if(typeof base[i] === 'object') html += '<div>'+i + " " + getattr(base[i]) + '</div>';
					else html = '<div>'+i+" "+base[i]+"</div>";
				}
			}
			return html;
		};
		if(w.ilm.state.attr) {
			z = w.ilm.getFrame();
			//html = getattr(w.ilm.state.attr);
			html += '<div><label for="timeframe">Ajaraam</label> <select onchange="ilm.setFrame(this.options[this.selectedIndex].value);ilm.reload();return false;" id="timeframe" name="timeframe">' +
				'<option value="1d"' + (z==='1d' ? ' selected' : '') + '>1 päev</option><option value="2d"'+(z==='2d'?' selected':'')+'>2 päeva</option><option value="3d"'+(z==='3d'?' selected':'')+'>3 päeva</option>' +
				'</select></div>';
			html += '<div><label for="forecast">Ennustus</label> <select onchange="ilm.setEstPlace(this.options[this.selectedIndex].value);ilm.reloadest();return false;" id="forecast" name="forecast">';
			html += '<option value="tabivere"'+(ilm.fcplace==='tabivere'?' selected':'')+'>Saadjärv</option><option value="tamme"'+(ilm.fcplace==='tamme'?' selected':'')+'>Võrtsjärv Tamme</option>';
			html += '</select></div>';
		} else {
			html = "<div>Siia tulevad seaded</div>";
		}
		f.html(html);
		return false;
	};
	w.ilm.Lingid = function (state) {
		var t = this, f = $("#lingid"), g = $("#sl");
		g.html("Lingid (klikk varjamiseks)");
		f.html(w.ilm.lingid.process(w.ilm.lingid.JSON));
		return false;		
	};
	w.ilm.Popup = function(name, cb) {
		var v = $("#popup");
		if(!v) return false;
		var b = $("#bghide"), y = w.innerHeight || e.clientHeight || g.clientHeight,
		act = v.attr("name");
		if (act) $("#ilm-" + act).removeClass("active");
		if(name && (!act || (act && act !== name))) {
			b.css({height : $(d).height(), position : 'absolute', left : 0, top : 0}).show();
			v.attr("name", name);
			$("#ilm-" + name).addClass("active");
			if(cb) cb.call(this, name);
			v.css({top : ((y/2) - (v.height()/2)) + $(w).scrollTop()}).show();
		}
		else if(v.is(":visible")) {
			v.hide();
			b.hide();
			v.attr("name", "");
		}
		return false;
	};
	$(d).ready(function () {
		$("#pagelogo").html(ilm.logo);
		//setWidth();
		$("#ilm-lingid").click(function(e){
			//ilm.showLinks();
			w.ilm.Popup("lingid",w.ilm.Lingid);
			return false;
		});
		$("#ilm-seaded").click(function(e){
			w.ilm.Popup("seaded",w.ilm.Options);
			return false;
		});
		$("#fctitle").on("click",function(){
			w.ilm.setEstPlace(w.ilm.nextPlace());
			w.ilm.reloadest();
			return false;
		});
		$("#datepicker").datepicker({
			dateFormat: 'yy-mm-dd',
			onSelect: function(dateText, inst) {
				w.ilm.setDate(dateText+"T00:00:00");
				w.ilm.reload();
			}
		});
		$("#curtime").on("click",function(){
			$("#datepicker").datepicker('show');
		});
		$("#curplace").on("click",function(){
			w.ilm.setCurPlace(w.ilm.nextCurPlace());
			w.ilm.reload();
			return false;
		});
		w.ilm.loadBase();
		w.ilm.loadInt(1000 * 60); // 1min
		w.ilm.loadEstInt(1000 * 60 * 10); // 10min
		$('#backgr').css({"display" : "block"});
		$(w).on("keydown", function (e) {
			//w.console.log("pressed" + e.keyCode);
			var obj = $("#popup");
			if(!obj) return;
			if (e.keyCode === 27 || e.keyCode === 13 ) {
				w.ilm.Popup("lingid", w.ilm.Lingid);
			}
			/*if (e.keyCode === 27 && obj.style.display === "block") {
				w.ilm.showLinks();
			}
			else if (e.keyCode === 13 && obj.style.display === "none") {
				w.ilm.showLinks();
			}*/
		});
	});
})(window);
