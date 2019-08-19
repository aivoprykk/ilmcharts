(function (w) {
    'use strict';
    var $ = w.$,
        d = document,
        e = d.documentElement,
        g = d.getElementsByTagName('body')[0],
        my = w.ilm,
        contid = 0;
    function fixCharts(width, fn) {
        return fn ? fn(width) : width;
        /*$(fn).css("width", width);
        $(d).ready(function () {
        var inner = $(fn).width();
        setTimeout(function () {
        $.each(w.ilm.charts, function (i, obj) {
        obj.setSize($(fn).width() - 6, obj.containerHeight, false);
        });
        }, 500);
        });
        */
    }
    function setWidth() {
        console.log(w.ilm.getWidth());
        var inner = ((w.ilm.getWidth() < 1024) ? '100' : '50') + '%';
        $('.float').each(function () {
            fixCharts(inner, this);
        });
    }
    w.ilm.popup='';
    w.ilm.Options = function(state){
        var f = $('#lingid'), xg = $('#sl');
        xg.html('Seaded (klikk varjamiseks)');
        my.settingTemplate(f);
        return false;
    };

    var toggleOffClickActive = function(b){
        b.toggleClass('menu-is-open');
    };

    var addOffClick = function(e, cb, target) {
        var offClick = function(evt) {
            if(evt && (!target || !$(evt.target).closest(target).length)) {
                if(e!==evt&& (!e || e.originalEvent!==evt)) {
                    if(cb) {
                        cb();
                    }
                    document.removeEventListener('click',offClick);
                }
            }
        };
        document.addEventListener('click',offClick);
    };

    w.ilm.Lingid = function (state) {
        var f = $('#lingid'), xg = $('#sl');
        xg.html('Lingid (klikk varjamiseks)');
        //xg.on('click',w.ilm.Popup.render());
        f.html(w.ilm.lingid.process(w.ilm.lingid.JSON));
        return false;
    };

    w.ilm.Popup = {
        popupEvent:null,
        isOpen:false,
        render: function(name, cb, caller) {
            if(caller) {
                w.ilm.Popup.popupEvent=caller;
            }
            var ev = w.ilm.Popup.popupEvent;
            var v = $('#popup');
            if(!v) {
                return false;
            }
            var b = $('#bghide'),
                hh = $('.navbar').height(),
                y = w.innerHeight || e.clientHeight || g.clientHeight,
                act = v.attr('name'),
                swp = 0;
            if (act) {
                $('#ilm-' + act).parent().removeClass('active');
            }
            var t = ev ? $(ev.target) : null;
            if(t && !t.hasClass('menu-is-open')) {
                toggleOffClickActive(t);
                addOffClick(ev, function(){
                    w.ilm.Popup.render(name);
                    toggleOffClickActive(t);
                },'#popup');
            }

            if(name && (!act || (act && act !== name))) {
                b.css({height : $(d).height(), position : 'absolute', left : 0, top : 0}).show();
                v.attr('name', name);
                $('#ilm-' + name).parent().addClass('active');
                if(cb) {
                    cb.call(this, name);
                }
                swp = ((y/2) - (v.height()/2)) + $(w).scrollTop();
                v.css({top : (swp > 0 ? swp : hh)}).show();
            }
            else if(v.is(':visible')) {
                v.hide();
                b.hide();
                v.attr('name', '');
            }
            return false;
        }
    };
    var isVisible = function(elem) { return !!elem && !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );};
    $(d).ready(function () {
        $('#pagelogo').html(w.ilm.logo);
        //setWidth();
        $('#ilm-viited').click(function(e){
            var b = $(e.target);
            e.preventDefault();
            if(w.ilm.linksasmenu) {
                b.attr({'data-toggle':'dropdown'});
                b.addClass('dropdown-toggle');
                var a = $('.ilm-viited-dropdown');
                a.html(w.ilm.lingid.process(w.ilm.lingid.JSON));
                a.height(w.innerHeight-(w.innerHeight/3));
            } else {
                b.removeClass('dropdown-toggle');
                b.attr({'data-toggele':'modal','data-target':'.ilm-modal'});
                $('#ilm-modal .popup-sisu').html(w.ilm.lingid.process(w.ilm.lingid.JSON));
                $('#ilm-modal').modal();
            }
            //return false;
        });
        $('#ilm-seaded').click(function(e){
            my.settingTemplate('#ilm-seaded-dropdown');
            //w.ilm.Popup("seaded",w.ilm.Options);
            //return false;
        });
        $('#fctitle').on('click',function(){
            w.ilm.setEstPlace(w.ilm.nextPlace());
            //w.ilm.reloadest();
            return false;
        });
        var dtpckr = $('#datepicker');
        if(dtpckr.length) {
            dtpckr.datepicker({
                dateFormat: 'yy-mm-dd',
                timezone: '+0'+(((my.addDst)?1:0)+2)+'00',
                onSelect: function(dateText, inst) {
                    w.ilm.setDate(dateText);
                    //w.ilm.reload();
                }
            });
            $('#curtime').on('click',function(){
                dtpckr.datepicker('show');
            });
        }
        $('#curplace').on('click',function(){
            w.ilm.setCurPlace(w.ilm.nextCurPlace());
            //w.ilm.reload();
            return false;
        });
        w.ilm.loadGrid();
        w.ilm.loadBase();
        w.ilm.loadInt(1000 * 60); // 1min
        w.ilm.loadEstInt(1000 * 60 * 10); // 10min
        $('#backgr').css({display: 'block'});
        $(w).on('keydown', function (e) {
            //w.console.log("pressed" + e.keyCode);
            var obj = $('#popup');
            if(!obj) {
                return;
            }
            if (e.keyCode === 27 || e.keyCode === 13 ) {
                //w.ilm.Popup('lingid', w.ilm.Lingid);
            }
            /*if (e.keyCode === 27 && obj.style.display === "block") {
				w.ilm.showLinks();
			}
			else if (e.keyCode === 13 && obj.style.display === "none") {
				w.ilm.showLinks();
			}*/
        });
        $(w).on('hashchange', function() {
            console.log('hash changed ' + w.location.hash);
            w.ilm.hash_data();
        });
    });
})(window);
