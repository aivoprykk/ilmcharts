// Initialize ilm object immediately to prevent race conditions
(function(my) {
    'use strict';
    var w = window,
        doc = document,
        loc = w.location,
        $ = w.$,
        _ = w._,
        console = w.console,
        SunCalc = w.SunCalc;

    function State(opt) {
        opt = opt || {};
        var defaults = {
            id: 'ilmchartsstore01',
            timeframe: opt.timeframe || 0,
            curplace: opt.curplace || 'aksi',
            chartorder: opt.chartorder || ['temp', 'wind_speed', 'wind_dir'],
            gridorder: opt.gridorder || [],
            gridindex: opt.gridindex || [],
            showgroup: opt.showgroup || '',
            binded: opt.binded || false,
            linksasmenu: opt.linksasmenu || false,
            timezone: opt.timezone || 2,
            viewmode: opt.viewmode || 'cur',
            samplemode: opt.samplemode || 'table',
            fctimeframe: opt.fctimeframe || 3, // days
            fcshownight: opt.fcshownight || true,
            viewStates: opt.viewStates || {}
        };
        this.id = defaults.id;
        this.attr = defaults;
        return this;
    }
    State.prototype = {
        save: function() {
            if (localStorage) {
                localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
            }
            return this;
        },
        load: function() {
            if (localStorage) {
                this.set(JSON.parse(localStorage.getItem(this.id)));
            }
            return this;
        },
        set: function(opt) {
            if (!opt) {
                return this;
            }
            var changed = false,
                a;
            for (a in this.attr) {
                if (a !== 'id' && (opt[a] !== undefined) && 
                    (typeof opt[a] !== 'object' ? opt[a] !== this.attr[a] : JSON.stringify(opt[a]) !== JSON.stringify(this.attr[a]))) {
                    this.attr[a] = (opt[a] === 'none') ? '' : opt[a];
                    changed = true;
                    console.log(a + ' ' + (typeof opt[a] === 'object' ? JSON.stringify(opt[a]) : opt[a]));
                }
            }
            if (changed) {
                this.save();
            }
            return this;
        },
        get: function(name) {
            return this.attr[name] || null;
        },
        destroy: function() {
            if (localStorage) { localStorage.removeItem(this.id); }
            return this;
        },
        toJSON: function() {
            var ret = {},
                a;
            for (a in this.attr) {
                if (a !== 'id') { ret[a] = this.attr[a]; }
            }
            return ret;
        }
    };

    function App(placeholder) {
        this.state = new State().load();
        this.placeholder = placeholder || '#container';
        this.datadir = 'archive';
        this.digits = 1;
        this.graphs = ['temp', 'wind_speed', 'wind_dir'];
        this.samplemode = this.state.attr.samplemode || 'table';
        this.fctimeframe = this.state.attr.fctimeframe || 3;
        this.viewmode = this.state.attr.viewmode || 'cur';
        this.timezone = this.state.attr.timezone;
        this.timeframe = this.state.attr.timeframe;
        this.showgroup = this.state.attr.showgroup;
        this.binded = this.state.attr.binded;
        this.linksasmenu = this.state.attr.linksasmenu;
        this.chartorder = this.state.attr.chartorder;
        
        this.curplace = this.state.attr.curplace || 'aksi';
        this.req_curplace = '';
        this.initialized = false;
        this.curplaces = {
            aksi: { 
                id: 'saadjarv_saadjarve', name: 'Saadjärve', group: 'saadjarv', bind: 'aksi', location: [58.535, 26.666],
                // directory name for historical sources we get hstations.key + hstations.id + '_data'
                hstations: {
                    wsds: { id: 'saadjarv_saadjarve', location: [58.54048, 26.68177] },
                    ut: { id: 'tartu', location: [58.365945, 26.690791] },
                    emu: { id: 'emu', location: [58.388575, 26.694013] }
                },
                hstations_new: {
                    wsds: { id: 'saadjarv_saadjarve', location: [58.9578, 23.4901] }
                },
                fcstations: {
                    wg: { id: 'aksi', link: '266923', location: [58.535, 26.666] },
                    yr: { id: 'aksi', location: [58.535, 26.666] },
                    emhi: { id: 'aksi', location: [58.529725, 26.639348] }
                }
            },
            tartu: { id: 'tartu', name: 'Tartu', group: 'koht', bind: 'tartu', location: [58.365945, 26.690791],
                hstations: {
                    ut: { id: 'tartu', location: [58.365945, 26.690791] },
                    emu: { id: 'emu', location: [58.388575, 26.694013] },
                    mnt: { id: 'tartu', location: [58.9578, 23.4901] }
                },
                hstations_new: {
                    ut: { id: 'tartu', location: [58.9578, 23.4901] },
                    emu: { id: 'emu', location: [58.388575, 26.694013] },
                    emhi: { id: 'Tartu', location: [58.9578, 23.4901] },
                    mnt: { id: 'tartu', location: [58.9578, 23.4901] }
                },
                fcstations: {
                    yr: { id: 'tartu', location: [58.380756, 26.723452] },
                    emhi: { id: 'tartu', location: [58.365945, 26.690791] }
                }
            },
            tamme: { 
                id: 'vortsjarv_tamme', name: 'Tamme', group: 'vortsjarv', bind: 'tamme', location: [58.271306, 26.134923],
                hstations: {
                    wsds: { id: 'vortsjarv_tamme', location: [58.271306, 26.134923] },
                    mnt: { id: 'tamme', location: [58.331664, 26.187807] }
                },
                hstations_new: {
                    wsds: [
                        { id: 'vortsjarv_tamme', location: [58.9578, 23.4901] }, 
                    ],
                    emhi: { id: 'Tartu_Tõravere', location: [58.9578, 23.4901] },
                },
                fcstations: {
                    wg: { id: 'tamme', link: '192609', location: [58.271306, 26.134923] },
                    yr: { id: 'tamme', location: [58.271, 26.132] },
                    emhi: { id: 'tamme', location: [58.224666, 26.135578] }
                }
            },
            joesuu: { 
                id: 'vortsjarv_joesuu', name: 'Jõesuu', group: 'vortsjarv', bind: 'joesuu', location: [58.384,26.127],
                hstations: {
                    wsds: { id: 'vortsjarv_joesuu', location: [58.384,26.127] }
                },
                hstations_new: {
                    wsds: [
                        { id: 'vortsjarv_joesuu', location: [58.9578, 23.4901] },
                    ],
                    emhi: { id: 'Rannu_Jõesuu', location: [58.9578, 23.4901] },
                },
                fcstations: {
                    wg: { id: 'joesuu', link: '692681', location: [58.386441, 26.131942] },
                    yr: { id: 'joesuu', location: [58.384, 26.127] },
                    emhi: { id: 'joesuu', location: [58.405000, 26.076182] }
                }
            },
            nina: { id: 'peipsi_nina', name: 'Nina', group: 'peipsi', bind: 'nina', location: [58.598889, 27.209722],
                hstations: {
                    wsds: { id: 'peipsi_nina', location: [58.598889, 27.209722] }
                },
                hstations_new: {
                    wsds: { id: 'peipsi_nina', location: [58.598889, 27.209722] },
                    emhi: { id: 'Peipsi_Nina', location: [58.598889, 27.209722] },
                },
                fcstations: {
                    wg: { id: 'nina', link: '20401', location: [58.598889, 27.209722] },
                    yr: { id: 'nina', link: '2-589982', location: [58.598889, 27.209722] },
                    emhi: { id: 'nina', location: [58.606881, 27.203583] }
                }
            },
            rapina: { id: 'peipsi_rapina',  name: 'Räpina Sadam', group: 'peipsi', bind: 'rapina', location: [58.126,27.532],
                hstations: {
                    wsds: { id: 'peipsi_rapina', location: [58.126,27.532] },
                    mnt: { id: 'rapina', location: [57.957275, 27.626020] },
                    ttu: { id: 'rapina', location: [57.957275, 27.626020] }
                },
                hstations_new: {
                    wsds: { id: 'peipsi_rapina', location: [58.9578, 23.4901] },
                    emhi: [
                        { id: 'Räpina', location: [58.9578, 23.4901] },
                        { id: 'Praaga', location: [58.9578, 23.4901] }
                    ],
                    ttu: { id: 'laaksaare', location: [58.9578, 23.4901] },
                },
                fcstations: {
                    wg: { id: 'rapina', link: '183648', location: [58.124988, 27.530086] },
                    yr: { id: 'rapina', location: [58.126,27.532] },
                    emhi: { id: 'rapina', location: [58.235806,27.470503] }
                }
            },
            haademeeste: { id: 'haademeeste', name: 'Häädemeeste', group: 'meri', bind: 'haademeeste', location: [58.071644, 24.478816],
                hstations: {
                    emhi: { id: 'haademeeste', location: [58.071644, 24.478816] },
                    mnt: { id: 'haademeeste', location: [58.071644, 24.478816] }
                },
                hstations_new: {
                    emhi: { id: 'Häädemeeste', location: [58.071644, 24.478816] },
                    mnt: { id: 'haademeeste', location: [58.071644, 24.478816] }
                },
                fcstations: {
                    wg: { id: 'haademeeste', link: '246420', location: [58.071644, 24.478816] },
                    yr: { id: 'haademeeste', link: '2-592231', location: [58.071644, 24.478816] },
                    emhi: { id: 'haademeeste', location: [58.079101, 24.493466] }
                }
            },
            parnu: { id: 'parnu', name: 'Pärnu', group: 'meri', bind: 'parnu', location: [58.365958, 24.526257],
                hstations: {
                    ttu: { id: 'parnu', location: [58.365958, 24.526257] },
                    emhi: { id: 'parnu', location: [58.365958, 24.526257] },
                    mnt: { id: 'parnu', location: [58.365958, 24.526257] },
                },
                hstations_new: {
                    ttu: { id: 'parnu', location: [58.365958, 24.526257] },
                    emhi: { id: 'Pärnu', location: [58.365958, 24.526257] },
                    mnt: { id: 'parnu', location: [58.365958, 24.526257] },
                },
                fcstations: {
                    wg: { id: 'parnu', link: '92781', location: [58.365958, 24.526257] },
                    yr: { id: 'parnu', link: '2-592231', location: [58.35, 24.545] },
                    emhi: { id: 'parnu', location: [58.382515, 24.510179] }
                }
            },
            paatsalu: { id: 'paatsalu', name: 'Virtsu', group: 'meri', bind: 'paatsalu', location: [58.508902, 23.663027],
                hstations: {
                    ttu: { id: 'paatsalu', location: [58.508902, 23.663027] },
                    emhi: { id: 'paatsalu', location: [58.508902, 23.663027] },
                },
                hstations_new: {
                    ttu: { id: 'virtsusadam', location: [58.508902, 23.663027] },
                    emhi: { id: 'Virtsu', location: [58.508902, 23.663027] },
                },
                fcstations: {
                    wg: { id: 'paatsalu', link: '479054', location: [58.508902, 23.663027] },
                    yr: { id: 'paatsalu', link: '2-589817', location: [58.508902, 23.663027] },
                    emhi: { id: 'paatsalu', location: [58.529210, 23.700999] }
                }
            },
            sorve: { id: 'sorve', name: 'Sõrve', group: 'meri', bind: 'sorve', location: [57.909984, 22.055313],
                hstations: {
                    emhi: [
                        { id: 'sorve', location: [57.909984, 22.055313] }
                    ],
                    mnt: { id: 'sorve', location: [57.909984, 22.055313] }
                },
                hstations_new: {
                    emhi: [
                        { id: 'Sõrve', location: [57.909984, 22.055313] },
                        { id: 'Mõntu', location: [57.909984, 22.055313] }
                    ],
                    mnt: { id: 'sorve', location: [57.909984, 22.055313] }
                },
                fcstations: {
                    wg: { id: 'sorve', link: '108163', location: [57.906, 22.045] },
                    yr: { id: 'sorve', link: '2-589817', location: [57.906, 22.045] },
                    emhi: { id: 'sorve', location: [57.918654, 22.059625] }
                }
            },
            saaretirp: { id: 'saaretirp', name: 'Heltermaa', group: 'meri', bind: 'saaretirp', location: [58.866845079804946, 23.04607326381741],
                hstations: {
                    ttu: { id: 'saaretirp', location: [58.866845079804946, 23.04607326381741] },
                    emhi: { id: 'saaretirp', location: [58.866845079804946, 23.04607326381741] }
                },
                hstations_new: {
                    ttu: { name: 'Heltermaa', id: 'heltermaa', location: [58.9578, 23.4901] },
                    emhi: { id: 'Heltermaa', location: [58.9578, 23.4901] },
                },
                fcstations: {
                    wg: { id: 'saaretirp', link: '1299399', location: [58.758, 22.789] },
                    yr: { id: 'saaretirp', link: '2-589817', location: [58.758, 22.789] },
                    emhi: { id: 'saaretirp', location: [58.758, 22.789] }
                }
            },
            ristna: { id: 'ristna', name: 'Ristna', group: 'meri', bind: 'ristna', location: [58.927304, 22.041023],
                hstations: {
                    emhi: { id: 'ristna', location: [58.927304, 22.041023] },
                    mnt: { id: 'ristna', location: [58.927304, 22.041023] }
                },
                hstations_new: {
                    emhi: { id: 'Ristna', location: [58.9578, 23.4901] },
                    mnt: { name: 'Ristna', id: 'ristna', location: [58.9578, 23.4901] }
                },
                fcstations: {
                    wg: { id: 'ristna', link: '96592', location: [58.927304, 22.041023] },
                    yr: { id: 'ristna', link: '2-794818', location: [58.927304, 22.041023] },
                    emhi: { id: 'ristna', location: [58.928326, 22.069358] }
                }
            },
            rohukyla: { id: 'rohukyla', name: 'Rohuküla', group: 'meri', link: '', bind: 'rohukyla', location: [58.9578, 23.4901],
                hstations: {
                    ttu: { id: 'rohukyla', location: [58.9578, 23.4901] }
                },
                hstations_new: {
                    ttu: { name: 'Rohuküla', id: 'rohukyla', location: [58.9578, 23.4901] },
                    emhi: { id: 'Rohuküla', location: [58.9578, 23.4901] },
                },
                fcstations: {
                    wg: { id: 'rohukyla', link: '245713', location: [58.911, 23.420] },
                    yr: { id: 'rohukyla', link: '2-794818', location: [58.911, 23.420] },
                    emhi: { id: 'rohukyla', location: [58.911, 23.420] }
                }
            },
            dirhami: { id: 'dirhami', name: 'Dirhami', group: 'meri', bind: 'dirhami', location: [59.2133, 23.5031],
                hstations: {
                    emhi: { id: 'dirhami', location: [59.2133, 23.5031] }
                },
                hstations_new: {
                    emhi: { id: 'Dirhami', location: [58.9578, 23.4901] },
                },
                fcstations: {
                    wg: { id: 'dirhami', link: '261785', location: [59.2133, 23.5031] },
                    yr: { id: 'dirhami', link: '2-796115', location: [59.2133, 23.5031] },
                    emhi: { id: 'dirhami', location: [59.208078, 23.496537] }
                }
            },
            pirita: { id: 'pirita', name: 'Pirita', group: 'meri', bind: 'pirita', location: [59.471562, 24.825608],
                hstations: {
                    emhi: { id: 'pirita', location: [59.471562, 24.825608] },
                    ttu: { id: 'pirita', location: [59.471562, 24.825608] }
                },
                hstations_new: {
                    emhi: { id: 'Pirita', location: [58.9578, 23.4901] },
                    ttu: { name: 'Vanasadam', id: 'vanasadam', location: [58.9578, 23.4901] }
                },
                fcstations: {
                    wg: { id: 'pirita', link: '125320', location: [59.471562, 24.825608] },
                    yr: { id: 'pirita', link: '2-798565', location: [59.471562, 24.825608] },
                    emhi: { id: 'pirita', location: [59.465992, 24.834083] }
                }
            },
            rohuneeme: { id: 'rohuneeme', name: 'Rohuneeme', group: 'meri', bind: 'rohuneeme', location: [59.551945, 24.794094],
                hstations: {
                    emhi: { id: 'rohuneeme', location: [59.551945, 24.794094] },
                    ttu: { id: 'rohuneeme', location: [59.551945, 24.794094] }
                },
                hstations_new: {
                    emhi: { id: 'Rohuneeme', location: [59.551945, 24.794094] },
                    ttu: { id: 'rohuneeme', location: [59.551945, 24.794094] }
                },
                fcstations: {
                    wg: { id: 'rohuneeme', link: '70524', location: [59.554, 24.791] },
                    yr: { id: 'rohuneeme', link: '2-798565', location: [59.554, 24.791] },
                    emhi: { id: 'rohuneeme', location: [59.554, 24.791] }
                }
            },
            loksa: { id: 'loksa', name: 'Loksa', group: 'meri', bind: 'koipsi', location: [59.5872, 25.6943],
                hstations: {
                    ttu: { id: 'koipsi', location: [58.9578, 23.4901] },
                    emhi: { id: 'loksa', location: [59.5872, 25.6943] },
                },
                hstations_new: {
                    ttu: { id: 'muuga', location: [58.9578, 23.4901] },
                    emhi: { id: 'Loksa', location: [58.9578, 23.4901] },
                },
                fcstations: {
                    wg: { id: 'loksa', link: '1299411', location: [59.581387, 25.722052] },
                    yr: { id: 'loksa', link: '2-591227', location: [59.581387, 25.722052] },
                    emhi: { id: 'koipsi', location: [59.581387, 25.722052] }
                }
            },
            haapsalu: { id: 'haapsalu', previd: 'topu', name: 'Haapsalu', group: 'meri', bind: 'haapsalu', location: [58.9578, 23.4901],
                hstations: {
                    emhi: { id: 'haapsalu', location: [58.9578, 23.4901] },
                },
                hstations_new: {
                    emhi: [
                        { id: 'Haapsalu_sadam', location: [58.9578, 23.4901] },
                        { id: 'Haapsalu', location: [58.9578, 23.4901] }
                    ]
                },
                fcstations: {
                    wg: { id: 'haapsalu', link: '245713', location: [58.9578, 23.4901] },
                    yr: { id: 'haapsalu', link: '2-591227', location: [58.957, 23.543] },
                    emhi: { id: 'haapsalu', location: [58.9578, 23.4901] }
                }
            },
            jogeva: { id: 'jogeva', name: 'Jõgeva', group: 'koht', bind: 'jogeva', location: [58.764849, 26.404618],
                hstations: {
                    mnt: { id: 'jogeva', location: [58.764849, 26.404618] }
                },
                hstations_new: {
                    emhi: { id: 'Jõgeva', location: [58.764849, 26.404618] },
                    mnt: { id: 'jogeva', location: [58.764849, 26.404618] }
                },
                fcstations: {
                    yr: { id: 'jogeva', link: '2-591902', location: [58.764849, 26.404618] },
                    emhi: { id: 'jogeva', location: [58.746083, 26.395523] }
                }
            },
            uhmardu: { id: 'uhmardu', name: 'Uhmardu', group: 'koht', bind: 'uhmardu', location: [58.640605, 26.791860],
                hstations: {
                    mnt: { id: 'uhmardu', location: [58.640605, 26.791860] }
                },
                hstations_new: {
                    mnt: { id: 'uhmardu', location: [58.640605, 26.791860] },
                    emhi: { id: 'Kääpa', location: [58.640605, 26.791860] }
                },
                fcstations: {
                    yr: { id: 'uhmardu', link: '2-793979', location: [58.640605, 26.791860] },
                    emhi: { id: 'uhmardu', location: [58.625507, 26.767479] }
                }
            },
            mustvee: {
                id: 'mustvee', name: 'Mustvee', group: 'peipsi', bind: 'mustvee', location: [58.848164, 26.937750],
                hstations: {
                    emhi: { id: 'mustvee', location: [58.7578, 26.7278] }
                },
                hstations_new: {
                    emhi: { id: 'Mustvee', location: [58.7578, 26.7278] }
                },
                fcstations: {
                    yr: { id: 'mustvee', link: '2-590066', location: [58.848,26.952] },
                    emhi: { id: 'mustvee', location: [58.848164,26.937750] }
                }
            }
        };

        // Forecast settings
        this.fcshownight = this.state.attr.fcshownight || false;
        this.fcprovidersmeta = {
            yr: { name: 'Yr.no', url: 'http://www.yr.no/en/details/table/', datadir: 'yr_data2', fc_file: 'yr_forecast.json', datatype: 'json' },
            wg: { name: 'Windguru', url: 'http://www.windguru.cz/', datadir: 'wg_data', fc_file: 'windguru_forecast.json', datatype: 'json' },
            emhi: { name: 'EMHI', url: 'http://www.ilmateenistus.ee/ilm/prognoosid/asukoha-prognoos/?coordinates=', datadir: 'empg_data', fc_file: 'empg_forecast.json', datatype: 'json' }
        };
        this.fcproviders_available = [];
        // History settings
        this.hprovidersmeta = {
            emhi: { name:'Emhi', url: 'https://www.ilmateenistus.ee/ilm/ilmavaatlused/vaatlusandmed/'},
            emu: { name:'Emu', url: 'https://energia.emu.ee/'},
            ut: { name:'UT', url: 'https://meteo.physic.ut.ee/'},
            wsds: { name:'WSDS', url: 'https://ilm.majasa.ee/'},
            mnt: { name:'MNT', url: 'https://balticroads.net/'},
            flydog: { name:'Flydog', url: 'https://databuoys.sensornest.com/'},
            ttu: { name:'TTU', url: 'http://on-line.msi.ttu.ee/'},
        };
        this.hproviders_available = [];
        this.useNewHistPlaces = true;
                
        this.addDst = this.isDst();
        this.lastdate = this.getTime(); //-(4*24*3600);
        this.date = 0;
        this.start = this.lastdate;
        this.historyactive = false;
        this.logo = 'Ilmainfo';

        this.chartoptions = {
            accessibility: {
                enabled: false
            },
            chart: {
                zoomType: 'x',
                spacingRight: 20,
                maxZoom: 3600000,
                marginRight: 110,
                marginLeft: 85,
                credits: {
                    enabled: false
                }
            },
            xAxis: {
                type: 'datetime',
                gridLineWidth: 1,
                dateTimeLabelFormats: {
                    millisecond: '%H:%M:%S.%L',
                    second: '%H:%M:%S',
                    minute: '%H:%M',
                    hour: '%H:%M',
                    day: '%a, %e.%m',
                    week: '%a, %e.%m',
                    month: '%b \'%y',
                    year: '%Y'
                }
            },
            plotOptions: {
                spline: {
                    lineWidth: 2,
                    states: {
                        hover: {
                            lineWidth: 2
                        }
                    },
                    marker: {
                        enabled: false
                    }
                },
                scatter: {
                    lineWidth: 0,
                    marker: {
                        radius: 2
                    }
                }
            },
            legend: {
                enabled: false
            },
            series: [],
            responsive: {
                rules: {
                    condition: {
                        minWidth: 450
                    }
                }
            }
        };
        this.charts = [];
        this.months = ['Jaanuar', 'Veebruar', 'Märts', 'Aprill', 'Mai', 'Juuni', 'Juuli', 'August', 'September', 'Oktoober', 'November', 'Detsember'];
        this.weekdays = ['Pühapäev', 'Esmaspäev', 'Teisipäev', 'Kolmapäev', 'Neljapäev', 'Reede', 'Laupäev'];
        this.shortweekdays = ['P', 'E', 'T', 'K', 'N', 'R', 'L'];
        if (loc.hash) {
            this.hash_data();
        }
    }

    App.prototype = {
        changed: '',
        normalizeHistValue: (v) => (Array.isArray(v) ? v : (v && typeof v === 'object') ? [v] : []),
        buildHistStationIndex: function(places, { useNew = false, ingridOnly = false } = {}) {
            const idx = new Map();

            for (const [placeKey, place] of Object.entries(places || {})) {
                if (!place) continue;
                const parent = {
                    placeKey,
                    id: place.id,
                    name: place.name,
                    group: place.group,
                    bind: place.bind,
                    location: place.location
                };
                const push = (srcKey, value) => {
                    for (const item of this.normalizeHistValue(value)) {
                        if (!item) continue;
                        if (ingridOnly && !item.ingrid) continue;
                        const key = `${srcKey}_${item.id}`;
                        const station = {
                            id: item.id,
                            location: item.location || null,
                            ingrid: !!item.ingrid,
                            source: srcKey,
                            parent
                        };
                        // Prefer ingrid=true if duplicates appear
                        if (!idx.has(key) || (station.ingrid && !idx.get(key).station.ingrid)) {
                            idx.set(key, { name: key, source: srcKey, id: item.id, station });
                        }
                    }
                };

                if (!useNew && place.hstations && typeof place.hstations === 'object') {
                    for (const [src, val] of Object.entries(place.hstations)) push(src, val);
                }
                else if (useNew && place.hstations_new && typeof place.hstations_new === 'object') {
                    for (const [src, val] of Object.entries(place.hstations_new)) push(src, val);
                }
            }

            return idx;
        },
        // Sorted list of "source_id" keys (stable, natural-ish order: by source then id)
        getSortedHistStationKeys: function(index, comparator) {
            const keys = Array.from(index.keys());
            keys.sort(
                comparator ||
                ((a, b) => {
                    const [as, ai] = a.split('_');
                    const [bs, bi] = b.split('_');
                    return as === bs
                        ? ai.localeCompare(bi, undefined, { numeric: true, sensitivity: 'base' })
                        : as.localeCompare(bs, undefined, { sensitivity: 'base' });
                })
            );
            return keys;
        },

        // Map a list of keys to the requested structure
        selectStationsByKeys: function(keys, index) {
            const out = [];
            for (const k of keys) {
                const rec = index.get(k);
                if (rec) out.push({ name: rec.name, station: rec.station });
            }
            return out;
        },
        // Normalize an id into a safe ASCII slug for DOM ids and serialization
        normalizeId: function(s) {
            if (typeof s !== 'string') return '';
            // NFD to split accents, then strip marks, keep a-z0-9_-, collapse spaces, lowercase
            return s
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_')
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '')
                .toLowerCase();
        },
        // Iterate all historical stations once in a unified way
        // fn receives { placeKey, place, srcKey, baseKey, item } and may return a non-undefined value to break and return that value
        // options: { useNew: false, ingridOnly: false, sourceMatch: (srcKey, baseKey) => boolean, placeMatch: (placeKey, place) => boolean }
        forEachHistStations: function(fn, options) {
            options = options || {};
            var useNew = (typeof options.useNew === 'boolean') ? options.useNew : false;
            var ingridOnly = !!options.ingridOnly;
            var sourceMatch = typeof options.sourceMatch === 'function' ? options.sourceMatch : null;
            var placeMatch = typeof options.placeMatch === 'function' ? options.placeMatch : null;

            var placesOrder = Object.keys(this.curplaces || {});
            for (var i = 0; i < placesOrder.length; i++) {
                var placeKey = placesOrder[i];
                var place = this.curplaces[placeKey];
                if (!place) continue;
                if (placeMatch && !placeMatch(placeKey, place)) continue;
                // gather sources from both collections
                var collections = [];
                if (!useNew && place.hstations && typeof place.hstations === 'object') collections.push(place.hstations);
                else if (useNew && place.hstations_new && typeof place.hstations_new === 'object') collections.push(place.hstations_new);
                for (var c = 0; c < collections.length; c++) {
                    var coll = collections[c];
                    var keys = Object.keys(coll);
                    for (var k = 0; k < keys.length; k++) {
                        var srcKey = keys[k];
                        var baseKey = srcKey;
                        if (sourceMatch && !sourceMatch(srcKey, baseKey)) continue;
                        var list = this.normalizeHistValue(coll[srcKey]);
                        for (var t = 0; t < list.length; t++) {
                            var item = list[t];
                            if (!item || !item.id) continue;
                            if (ingridOnly && !item.ingrid) continue;
                            var ret = fn({ placeKey: placeKey, place: place, srcKey: srcKey, baseKey: baseKey, item: item });
                            if (typeof ret !== 'undefined') return ret;
                        }
                    }
                }
            }
            return undefined;
        },
        // Resolve normalized row-key back to raw id from current data
        resolveRawId: function(source, idFromRowKey, rowKey) {
            // Direct mapping filled when listing rows
            if (this.rowKeyRawMap && rowKey && this.rowKeyRawMap[rowKey]) return this.rowKeyRawMap[rowKey];
            var self = this;
            var wantedSource = source;
            
            // First try to find exact match with raw ID
            var found = self.forEachHistStations(function(ctx) {
                if (ctx.item.id === idFromRowKey && ctx.baseKey === wantedSource) {
                    return ctx.item.id;
                }
            }, { useNew: self.useNewHistPlaces });
            if (typeof found !== 'undefined') return found;
            
            // If not found, try normalized lookup (backward compatibility)
            var normalizedId = self.normalizeId(idFromRowKey);
            found = self.forEachHistStations(function(ctx) {
                if (self.normalizeId(ctx.item.id) === normalizedId && ctx.baseKey === wantedSource) {
                    return ctx.item.id;
                }
            }, { useNew: self.useNewHistPlaces });
            if (typeof found !== 'undefined') return found;
            
            // Try with older data if new data didn't work
            found = self.forEachHistStations(function(ctx) {
                if (self.normalizeId(ctx.item.id) === normalizedId && ctx.baseKey === wantedSource) {
                    return ctx.item.id;
                }
            }, { useNew: false });
            
            return typeof found !== 'undefined' ? found : idFromRowKey; // fallback to original
        },
        // Build available stations for grid index - returns [{key: curplace_key, name: display_name, hprovider: source}]
        buildAvailableStations: function(ingridOnly) {
            var self = this;
            var stations = [];
            var seen = new Set();
            
            self.forEachHistStations(function(ctx) {
                if (ingridOnly !== false && !ctx.item.ingrid) return;
                
                var key = ctx.placeKey;
                var name = (ctx.item.name || ctx.place.name);
                var hprovider = ctx.baseKey; // emhi, wsds, etc.
                var stationKey = key + '_' + hprovider + '_' + ctx.item.id;
                
                if (!seen.has(stationKey)) {
                    seen.add(stationKey);
                    stations.push({
                        key: key,
                        name: name,
                        hprovider: hprovider,
                        stationId: ctx.item.id,
                        displayName: name + ' ' + ((hprovider === 'wsds') ? 'WS' : hprovider.toUpperCase())
                    });
                }
            }, { useNew: self.useNewHistPlaces });
            
            return stations;
        },
        
        // Get current grid index from state or build default
        getGridIndex: function() {
            var persisted = this.state.attr.gridindex || [];
            if (persisted.length > 0) {
                // Build stations for persisted place keys, applying viewStates
                var validIndex = [];
                var viewStates = this.state.attr.viewStates || {};
                
                for (var i = 0; i < persisted.length; i++) {
                    var placeKey = persisted[i];
                    if (this.curplaces[placeKey]) {
                        var station = this.buildStationForPlace(placeKey, viewStates[placeKey]);
                        if (station) {
                            validIndex.push(station);
                        }
                    }
                }
                
                return validIndex;
            } else {
                // Default to one station per curplaces key: first provider's first station
                return this.buildInitialGridIndex();
            }
        },
        
        // Helper to build a station object for a specific place, using viewState or defaults
        buildStationForPlace: function(placeKey, savedState) {
            var place = this.curplaces[placeKey];
            if (!place) return null;
            
            // If we have a saved state, try to use it
            if (savedState && savedState.hprovider && savedState.hstation_id) {
                var stationFromState = this.getStationInfoFromViewState(placeKey, savedState);
                if (stationFromState) return stationFromState;
            }
            
            // Fallback to first available provider's first station
            var hStationsSrc = this.useNewHistPlaces ? place.hstations_new : place.hstations;
            if (!hStationsSrc) return null;
            
            var providers = Object.keys(hStationsSrc);
            if (providers.length === 0) return null;
            
            var firstProvider = providers[0];
            var stationList = this.normalizeHistValue(hStationsSrc[firstProvider]);
            if (stationList.length === 0) return null;
            
            var firstStation = stationList[0];
            return {
                key: placeKey,
                name: firstStation.name || place.name,
                hprovider: firstProvider,
                stationId: firstStation.id,
                displayName: (firstStation.name || place.name) + ' ' + ((firstProvider === 'wsds') ? 'WS' : firstProvider.toUpperCase())
            };
        },
        
        // Build initial grid index with one station per curplaces key
        buildInitialGridIndex: function() {
            var stations = [];
            var seen = new Set();
            var viewStates = this.state.attr.viewStates || {};
            
            // Iterate through curplaces to get one station per place key
            for (var placeKey in this.curplaces) {
                if (!Object.prototype.hasOwnProperty.call(this.curplaces, placeKey)) continue;
                if (seen.has(placeKey)) continue; // Ensure only one per place key
                
                var place = this.curplaces[placeKey];
                if (!place) continue;
                
                // Get hstations (prefer new over old)
                var hStationsSrc = this.useNewHistPlaces ? place.hstations_new : place.hstations;
                if (!hStationsSrc || typeof hStationsSrc !== 'object') continue;
                
                var selectedStation = null;
                var selectedProvider = null;
                
                // Check if user has a saved viewState for this place
                var savedState = viewStates[placeKey];
                if (savedState && savedState.hprovider && savedState.hstation_id && hStationsSrc[savedState.hprovider]) {
                    var savedStationList = this.normalizeHistValue(hStationsSrc[savedState.hprovider]);
                    var targetStation = null;
                    
                    // Try saved index first if available
                    if (typeof savedState.hstation_index === 'number' && 
                        savedState.hstation_index >= 0 && 
                        savedState.hstation_index < savedStationList.length &&
                        savedStationList[savedState.hstation_index].id === savedState.hstation_id) {
                        targetStation = savedStationList[savedState.hstation_index];
                    } else {
                        // Fallback to finding by ID
                        targetStation = savedStationList.find(function(s) { return s.id === savedState.hstation_id; });
                    }
                    
                    if (targetStation) {
                        selectedStation = targetStation;
                        selectedProvider = savedState.hprovider;
                    }
                }
                
                // If no saved state or saved station not found, use first provider's first station
                if (!selectedStation) {
                    var providerKeys = Object.keys(hStationsSrc);
                    for (var p = 0; p < providerKeys.length; p++) {
                        var provider = providerKeys[p];
                        var stationList = this.normalizeHistValue(hStationsSrc[provider]);
                        
                        // Get first station from this provider
                        if (stationList.length > 0) {
                            var station = stationList[0];
                            if (station && station.id) {
                                selectedStation = station;
                                selectedProvider = provider;
                                break; // Only take first provider's first station
                            }
                        }
                    }
                }
                
                // Add the selected station to grid
                if (selectedStation && selectedProvider) {
                    seen.add(placeKey);
                    stations.push({
                        key: placeKey,
                        name: selectedStation.name || place.name,
                        hprovider: selectedProvider,
                        stationId: selectedStation.id,
                        displayName: (selectedStation.name || place.name) + ' ' + ((selectedProvider === 'wsds') ? 'WS' : selectedProvider.toUpperCase())
                    });
                }
            }
            
            return stations;
        },
        
        // Update a specific grid row to reflect viewState changes without full reload
        updateGridRowForPlace: function(placeKey) {
            if (!this.initialized || !placeKey) return;
            
            var viewStates = this.state.attr.viewStates || {};
            var savedState = viewStates[placeKey];
            
            // Find the grid row for this place using the correct ID format (same as loadGrid)
            var uniqueId = 'grid-node-' + placeKey;
            var row = document.getElementById(uniqueId);
            
            if (row && savedState) {
                // Update the row's station information based on viewState
                var place = this.curplaces[placeKey];
                if (!place) return;
                
                var stationInfo = this.getStationInfoFromViewState(placeKey, savedState);
                if (stationInfo) {
                    // Update the station display name in the row
                    var nameElement = row.querySelector('.station-name, .menu-item-name, td:first-child');
                    if (nameElement) {
                        nameElement.textContent = stationInfo.displayName;
                    }
                    
                    // Update data attributes for the new station
                    row.setAttribute('data-hprovider', stationInfo.hprovider);
                    row.setAttribute('data-stationid', stationInfo.stationId);
                    row.setAttribute('data-displayname', stationInfo.displayName);
                    
                    // If there are provider-specific styling classes, update them
                    row.className = row.className.replace(/\bhprovider-\w+\b/g, '');
                    row.classList.add('hprovider-' + stationInfo.hprovider);
                }
            }
        },
        
        // Helper to get station info from viewState
        getStationInfoFromViewState: function(placeKey, savedState) {
            if (!savedState.hprovider || !savedState.hstation_id) return null;
            
            var place = this.curplaces[placeKey];
            if (!place) return null;
            
            var hStationsSrc = this.useNewHistPlaces ? place.hstations_new : place.hstations;
            if (!hStationsSrc || !hStationsSrc[savedState.hprovider]) return null;
            
            var savedStationList = this.normalizeHistValue(hStationsSrc[savedState.hprovider]);
            var targetStation = null;
            
            // Try saved index first if available
            if (typeof savedState.hstation_index === 'number' && 
                savedState.hstation_index >= 0 && 
                savedState.hstation_index < savedStationList.length &&
                savedStationList[savedState.hstation_index].id === savedState.hstation_id) {
                targetStation = savedStationList[savedState.hstation_index];
            } else {
                // Fallback to finding by ID
                targetStation = savedStationList.find(function(s) { return s.id === savedState.hstation_id; });
            }
            
            if (targetStation) {
                return {
                    key: placeKey,
                    name: targetStation.name || place.name,
                    hprovider: savedState.hprovider,
                    stationId: targetStation.id,
                    displayName: (targetStation.name || place.name) + ' ' + ((savedState.hprovider === 'wsds') ? 'WS' : savedState.hprovider.toUpperCase())
                };
            }
            
            return null;
        },
        
        // Helper to get station info for grid display, using viewState or defaults
        getStationInfoForGrid: function(placeKey, savedState) {
            // First try to use viewState if available
            if (savedState) {
                var stationFromState = this.getStationInfoFromViewState(placeKey, savedState);
                if (stationFromState) return stationFromState;
            }
            
            // Fallback to buildStationForPlace which handles defaults
            return this.buildStationForPlace(placeKey, savedState);
        },
        
        // Update grid index in state
        setGridIndex: function(stations) {
            if (!Array.isArray(stations)) return;
            // Only store place keys since we want one row per place that can change stations via viewStates
            var keys = stations.map(function(s) { return s.key; });
            this.state.set({ gridindex: keys });
        },
        
        // Add station to grid index (now simplified to work with place keys only)
        addStationToGrid: function(key, hprovider, stationId, position) {
            // Since we now only store place keys and one row per place, 
            // this function adds a place key if it's not already present
            var current = this.state.attr.gridindex || [];
            
            // Check if place key already exists
            var exists = current.indexOf(key) !== -1;
            if (exists) return true; // Place already in grid
            
            // Add the place key to grid index
            if (typeof position === 'number' && position >= 0 && position <= current.length) {
                current.splice(position, 0, key);
            } else {
                current.push(key);
            }
            this.state.set({ gridindex: current });
            return true;
        },
        
        // Remove station from grid index (now simplified to work with place keys only)
        removeStationFromGrid: function(key) {
            // Since we now only store place keys, this removes the entire place from grid
            var current = this.state.attr.gridindex || [];
            var newIndex = current.filter(function(placeKey) { return placeKey !== key; });
            this.state.set({ gridindex: newIndex });
            return true;
        },
        hash_data: function() {
            var changed = {};
            //if(!loc.hash) return false;
            if (loc.hash) {
                var a = loc.hash.substring(1).split(/[&|/]/);
                var i = 0;
                var j = a.length;
                
                // Get available forecast providers/places
                var places = Object.keys(this.curplaces);

                if (j) {
                    for (; i < j; ++i) {
                        var b = a[i].split('=');
                        if (b[0]) {
                            if ((/aeg/.test(b[0]) && b[1]) || (/\d*[-.]\d*[-.]\d/).test(b[0])) {
                                changed.aeg = b[1] || b[0];
                            } else if ((/koht/.test(b[0]) && b[1]) || places.indexOf(b[0]) >= 0 ) {
                                changed.place = b[1] || b[0];
                                if(changed.place && this.curplaces[changed.place])
                                    this.req_curplace = changed.place;
                            } else if ((/raam/.test(b[0]) && b[1]) || (/\d*[dh]/).test(b[0])) {
                                changed.raam = b[1] || b[0];
                            }
                        }
                    }
                    //console.log(this.date);
                }
            }
            if(changed.raam) this.setFrame(changed.raam, 'ei', 'ja');
            if(changed.aeg) this.setDate(changed.aeg, 'ei');
            if(this.initialized && this.req_curplace && this.req_curplace !== this.curplace) {
                this.loadGraph(this, this.req_curplace);
                this.req_curplace = '';
            }
            return false;
        },
        graph_name: function(name) {
            return (name === 'wind_speed') ? 'Tuule kiirus' :
                (name === 'wind_dir') ? 'Tuule suund' : 'Temperatuur';
        },
        reorder: function(div) {
            var el = null,
                id = null,
                i, j, co = this.chartorder,
                a;
            if (!div) { div = this.placeholder; }
            $(div).children().each(function(k, l) {
                if (l.className && (/float/).test(l.className)) {
                    a = [];
                    _.each(l.childNodes, function(i) {
                        if (i && (j = i.className || '')) {
                            if (/meta/.test(j)) el = i;
                            if (/movable/.test(j)) a.push(i);
                        }
                    });
                    _.each(a, function(i) {
                        //console.log(i);
                        l.removeChild(i);
                        i = null;
                    });
                    for (i = 0, j = co.length; i < j; ++i) {
                        id = doc.getElementById(co[i] + (k + 1));
                        //console.log(co[i]+(k+1));
                        if (!id) {
                            id = doc.createElement('div');
                            id.setAttribute('id', co[i] + (k + 1));
                            id.className = 'movable chart-frame' + ((co[i].match(/_dir/)) ? 2 : 1);
                        }
                        l.insertBefore(id, el);
                    }
                    if (k === 0) my.reload();
                    else my.reloadest();
                }
            });
        },
        loadBase: function(div, node) {
            var el = null,
                newel = null,
                i, j, m = 0,
                co = this.chartorder;
            if (!div) { div = this.placeholder; }
            $(div).children().each(function(k, l) {
                if (l.className && l.className.match(/float/)) {
                    ++m;
                    for (i = 0, j = l.childNodes.length; i < j; ++i) {
                        el = l.childNodes[i];
                        if (el.classname && (/(title|datepicker)/i).test(el.className)) continue;
                        if (el.className && el.className.match(/meta/)) {
                            break;
                        }
                        el = null;
                    }
                    for (i = 0, j = co.length; i < j; ++i) {
                        newel = doc.getElementById(co[i] + (node || m));
                        if (!newel) {
                            newel = doc.createElement('div');
                            newel.setAttribute('id', co[i] + (node || m));
                            newel.className = 'movable chart-frame' + ((co[i].match(/_dir/)) ? 2 : 1);
                            l.insertBefore(newel, el);
                        }
                    }
                }
            });
        },
        ready: function(e, fn) {
            if (e.readyState) {
                e.onreadystatechange = function() {
                    if (e.readyState === 'loaded' || e.readyState === 'complete') {
                        e.onreadystatechange = null;
                        if (fn) fn();
                    }
                };
            } else {
                e.onload = function() {
                    if (fn) fn();
                };
            }
        },
        makeSortable: function(div, fn) {
            var self = w.ilm,
                swp = $(div);
            if (swp.sortable) {
                swp.each(function(i, a) { focusEvent(a); });
                swp.sortable({
                    connectWith: div,
                    stop: function() {
                        var nl = swp.sortable('toArray', { attribute: 'name' });
                        if (fn) fn(nl);
                        else {
                            // Update grid index based on new order
                            var newStations = [];
                            var currentIndex = self.getGridIndex();
                            var stationMap = {};
                            for (var i = 0; i < currentIndex.length; i++) {
                                stationMap[currentIndex[i].key] = currentIndex[i];
                            }
                            for (var j = 0; j < nl.length; j++) {
                                if (stationMap[nl[j]]) {
                                    newStations.push(stationMap[nl[j]]);
                                }
                            }
                            self.setGridIndex(newStations);
                        }
                    }
                });
                swp.sortable('enable');
            }
        },
        makeUnSortable: function(div) {
            var swp = $(div);
            if (swp.sortable) {
                swp.sortable('disable');
                swp.each(function(i, a) { unFocusEvent(a); });
            }
        },
        map: null,
        markers: {},
        markertype: 'custom',
        markerclass: null,
        googleMarkerClassCreate: function() {
            var map = w.google.maps;

            function gmp(position, obj) {
                this.c = {};
                var c = this.c;
                this.label = { text: '', color: 'gray', fontSize: '100%', wd: 0 };
                this.icon = { strokeColor: 'gray' };
                this.position = position;
                this.title = obj && obj.title ? obj.title : '';

                c.label = document.createElement('span');
                c.label.classList.add('compass-label');

                c.arrow = document.createElement('span');
                c.arrow.classList.add('compass-arrow');

                var bg = document.createElement('span');
                bg.classList.add('compass-bg');

                // This zero-height div is positioned at the bottom of the tip.
                c.div = document.createElement('span');
                c.div.classList.add('compass');
                c.div.classList.add('compass-container');
                c.div.appendChild(c.label);
                c.div.appendChild(c.arrow);
                c.div.appendChild(bg);
                c.container = document.createElement('div');
                c.container.classList.add('compass-bubble');
                c.container.appendChild(c.div);
                w.google.maps.OverlayView.preventMapHitsAndGesturesFrom(c.container);
                // Optionally stop clicks, etc., from bubbling up to the map.
            }

            // ES5 magic to extend google.maps.OverlayView.
            gmp.prototype = Object.create(map.OverlayView.prototype);

            /** Called when the popup is added to the map. */
            gmp.prototype.onAdd = function() {
                this.getPanes().floatPane.appendChild(this.c.container);
            };

            /** Called when the popup is removed from the map. */
            gmp.prototype.onRemove = function() {
                if (this.c.container.parentElement) {
                    this.c.container.parentElement.removeChild(this.c.container);
                }
            };

            /** Called each frame when the popup needs to draw itself. */
            gmp.prototype.draw = function() {
                var divPosition = this.getProjection().fromLatLngToDivPixel(this.position);

                // d-none the popup when it is far out of view.
                var display =
                    Math.abs(divPosition.x) < 4000 && Math.abs(divPosition.y) < 4000 ?
                        'block' :
                        'none';

                if (display === 'block') {
                    this.c.container.style.left = divPosition.x + 'px';
                    this.c.container.style.top = divPosition.y + 'px';
                }
                if (this.c.container.style.display !== display) {
                    this.c.container.style.display = display;
                }
            };
            gmp.prototype.setLabel = function(data) {
                if (data) {
                    if (data.text) {
                        this.label.text = data.text;
                    }
                    if (data.wd) {
                        this.label.wd = data.wd;
                        this.c.arrow.style.transform = 'rotate(' + (data.wd - 180) + 'deg)';
                    }
                    if (data.color) {
                        this.label.color = data.color;
                        this.c.label.style.color = data.color;
                    }
                    if (data.fontSize) {
                        this.label.fontSize = data.fontSize;
                        this.c.label.style.fontSize = data.fontSize;
                    }
                    this.c.label.innerHTML = data.text || '0';
                }
            };
            gmp.prototype.getLabel = function() {
                return this.label;
            };

            gmp.prototype.setIcon = function(obj) {
                if (obj && obj.strokeColor) {
                    if (/rgb/.test(obj.strokeColor)) {
                        this.icon.strokeColor = obj.strokeColor.replace(/rgba?\(([0-9]+),(?:\s+)?([0-9]+),(?:\s+)?([0-9]+).+$/, 'rgba($1,$2,$3,0.6)');
                    } else {
                        this.icon.strokeColor = obj.strokeColor;
                    }
                    this.c.div.style.borderColor = this.icon.strokeColor;
                }
            };

            gmp.prototype.getIcon = function() {
                return this.icon;
            };

            gmp.prototype.addListener = function(name, cb) {
                var self = this;
                //return w.google.maps.event.addListener(self.c.container, name, cb);
                return self.c.container.addEventListener(name, cb);
            };
            gmp.prototype.getPosition = function() {
                return this.position;
            };

            return gmp;
        },
        googleMarkerIcon: function(ws) {
            ws = ws || 5;
            return {
                path: w.google.maps.SymbolPath.CIRCLE,
                fillColor: 'white',
                fillOpacity: 0.2,
                scale: Math.pow(2, ws > 0 ? ws : 3) / 2,
                strokeColor: 'gray',
                strokeWeight: 0.5
            };
        },
        addGoogleMarker: function(ws, pos, map, title, id) {
            var self = this,
                marker;
            id = id || 'none';
            if (self.markers[id]) {
                marker = self.markers[id];
            } else {
                if (self.markertype === 'custom') {
                    if (!self.markerclass) {
                        self.markerclass = self.googleMarkerClassCreate();
                    }
                    marker = new self.markerclass(new w.google.maps.LatLng(pos.lat, pos.lng), { title: title });
                } else {
                    marker = new w.google.maps.Marker({
                        position: pos,
                        icon: self.googleMarkerIcon(ws),
                        title: title || null,
                        labelInBackground: false,
                    });
                }
                self.markers[id] = marker;
            }
            if (ws && map) {
                marker.setLabel({ text: ws + '', color: 'black', wd: '0' });
            }
            marker.setMap(map);
        },
        initGoogleMap: function(elid, markers) {
            var self = this,
                keys = null,
                el = document.getElementById(elid);
            var datatable = $('#menu-container .table');
            $(el).css({ height: datatable.css('height') });
            self.map = new w.google.maps.Map(el, {
                zoom: 7,
                center: new w.google.maps.LatLng(58.824112, 24.834173),
                mapTypeId: 'terrain',
                styles: googleMapStyles1
            });

            if (Object.prototype.toString.call(markers) === '[object Object]') {
                keys = Object.keys(markers);
            }
            if (keys) {
                for (var i = 0; i < keys.length; i++) {
                    var m = markers[keys[i]];
                    self.addGoogleMarker(0, { lat: m.location[0], lng: m.location[1] }, self.map, m.name, keys[i]);
                }
            }
        },
        loadMap: function(e) {
            var self = this,
                me = e && e.target ? $(e.target) : e ? $(e) : $('.chart-container');
            
            var sampleModes = ['graph', 'table'], container = document.querySelector('.container'), sm;
            sampleModes.forEach(function(name) {
                sm = 'samplemode-' + name;
                if (self.samplemode != name && container && container.classList.contains(sm)) {
                    container.classList.remove(sm);
                }
                else if (self.samplemode === name && container && !container.classList.contains(sm)) {
                    container.classList.add(sm);
                }
            });
            
            var templ = '<div class="x-container map-container"><div><span class="map-info">&nbsp;</span></div><div class="mapbox" id="map"></div></div>';
            if (me) {
                me.html(templ);
                self.initGoogleMap('map', self.curplaces);
            }
            return false;
        },
        mapHistStations: function(fn) {
            if(!fn) return;
            var self = this;
            self.forEachHistStations(function(ctx) {
                fn({ id: ctx.srcKey, station: ctx.item, parent: ctx.place });
            }, { useNew: self.useNewHistPlaces });
        },
        loadGrid: function(div) {
            var self = this,
                el = null,
                co = 'grid-node-';
            if (!div) { div = this.grid_placeholder || 'menu-container'; }
            el = doc.getElementById(div);
            if (el) {
                var html = '<tbody>';
                
                // Get current grid index
                var stations = this.getGridIndex();
                
                // Get all viewStates for efficiency
                var viewStates = this.state.attr.viewStates || {};
                
                // Render rows using station index and apply viewStates
                for (var i = 0; i < stations.length; i++) {
                    var station = stations[i];
                    var placeKey = station.key;
                    var uniqueId = co + station.key; // Only use place key since we want one row per place
                    
                    // Get saved viewState for this place
                    var savedState = viewStates[placeKey];
                    var displayName = station.displayName;
                    var rowClass = 'data-menu-row';
                    
                    // Enhance display name with saved provider info if different from current
                    if (savedState && savedState.hprovider && savedState.hprovider !== station.hprovider) {
                        displayName += ' (saved: ' + savedState.hprovider.toUpperCase() + ')';
                    }
                    
                    // Only store place key in DOM - all provider info comes from savedState
                    html += '<tr id="' + uniqueId + '" name="' + placeKey + '" class="' + rowClass + '" ';
                    html += '<td class="sortable-is-active d-none">-</td><td colspan="100">' + displayName + '</td>';
                    html += '</tr>';
                }
                html += '</tbody>';
                $(el).html(_.template(this.dataTableTemplate)({ classes: 'table sortable-table table-sm', thead: this.gridHeadTemplate, tbody: html }))
                clearInterval(this.gridintval);
                this.fillGridLast(this);
                setInterval(this.fillGridLast, 120000, this); //120sec
                $('.data-menu-row').on('click', function() {
                    $('.data-menu-row').each(function(b, a) { a.className = a.className.replace(' selected', ''); });
                    this.className += ' selected';
                    var placeKey = $(this).attr('name');
                    
                    // Set place first to update available providers
                    self.setCurPlace(placeKey, true, false);
                    
                    // Get saved provider info from viewStates using helper functions
                    var hStruct = self.getCurrentHProviderStruct(placeKey);
                    var fcStruct = self.getCurrentFcProviderStruct(placeKey);
                    
                    // Apply saved historical provider if available for this place
                    if (hStruct && hStruct.provider && self.hproviders_available.indexOf(hStruct.provider) !== -1) {
                        self.setHProvider(hStruct.provider, false);
                        if (hStruct.currentStation && hStruct.currentIndex !== undefined) {
                            // Verify that the saved station still exists at the saved index
                            var currentPlace = self.curplaces[placeKey];
                            var hStations = self.useNewHistPlaces ? currentPlace.hstations_new : currentPlace.hstations;
                            if (hStations && hStations[hStruct.provider]) {
                                var hStationList = self.normalizeHistValue(hStations[hStruct.provider]);
                                if (hStruct.currentIndex < hStationList.length && 
                                    hStationList[hStruct.currentIndex].id === hStruct.currentStation.id) {
                                    self.setHStationIndex(hStruct.currentIndex, false);
                                } else {
                                    // Fallback to finding by ID
                                    var actualIndex = hStationList.findIndex(function(s) { return s.id === hStruct.currentStation.id; });
                                    if (actualIndex !== -1) {
                                        self.setHStationIndex(actualIndex, false);
                                    }
                                }
                            }
                        }
                    }
                    
                    // Apply saved forecast provider if available for this place
                    if (fcStruct && fcStruct.provider && self.fcproviders_available.indexOf(fcStruct.provider) !== -1) {
                        self.setFcProvider(fcStruct.provider, false);
                        if (fcStruct.currentStation && fcStruct.currentIndex !== undefined) {
                            // Verify that the saved station still exists
                            var currentPlace2 = self.curplaces[placeKey];
                            if (currentPlace2.fcstations && currentPlace2.fcstations[fcStruct.provider]) {
                                var fcStationList = self.normalizeHistValue(currentPlace2.fcstations[fcStruct.provider]);
                                if (fcStruct.currentIndex < fcStationList.length && 
                                    fcStationList[fcStruct.currentIndex].id === fcStruct.currentStation.id) {
                                    // Station still exists at saved index, use it directly
                                    // (fcplace is managed internally by setFcProvider)
                                } else {
                                    // Station moved or was removed, find it by ID
                                    var targetFcStation = fcStationList.find(function(s) { return s.id === fcStruct.currentStation.id; });
                                    if (targetFcStation) {
                                        // Station exists but at different index - it will be handled by setFcProvider
                                    }
                                }
                            }
                        }
                    }
                    
                    // Load the graph with applied viewState
                    self.loadGraph(this, placeKey);
                });
                $('.data-menu-order').on('click', function() {
                    if ($(this).hasClass('change')) {
                        $(this).removeClass('change');
                        self.makeSortable('.sortable-table tbody');
                        $('.sortable-is-active').each(function(i, a) { $(a).removeClass('d-none'); });
                    } else {
                        $(this).addClass('change');
                        self.makeUnSortable('.sortable-table tbody');
                        $('.sortable-is-active').each(function(i, a) { $(a).addClass('d-none'); });
                    }
                });
                if(self.req_curplace) {
                    self.loadGraph(this, self.req_curplace);
                    self.req_curplace = '';
                    self.doReload('both');
                }
               
            }
            this.initialized = true;
        },
        loadGraph: function(e, name) {
            var self = this,
                o = '',
                n = (self.curplaces[name] || self.curplaces[self.curplace]),
                m = self.getWidth() < 850 ? $('.chart-box') : $('.chartbox'),
                me = e && e.target ? $(e.target) : e ? $(e) : null,
                
                // When called from grid with a curplaces key, update current place
                func = function(el, n) {
                    var oldHProvider = self.hprovider;
                    var oldFcProvider = self.fcprovider;
                    var shouldReload = false;
                    
                    // If name is a valid curplaces key, just set it - setCurPlace handles all provider updates
                    if (name && self.curplaces[name]) {
                        self.setCurPlace(name, true, false); // Don't reload yet - DOM not ready
                        shouldReload = true;
                    }
                    n = n || {};
                    var u = 0,
                        xlarge = (self.getWidth() >= 1240) ? true : false,
                        s = '';
                    s += '<div class="x-container chartbox">';
                    s += `<div class="chart-control-box">
                        <div class="items-container"><div>
                        <div class="viewmode-control">`;
                    s += '<span class="title-chart"></span>&nbsp;<span class="change-chart badge bg-primary" name="' + (self.viewmode === 'cur' ? 'est' : 'cur') + '">Näita ' + (self.viewmode === 'cur' ? 'Prognoosi' : 'Ajalugu') + '</span>';
                    s += '</div>';
                    s += '<div class="samplemode-control">';
                    s += '<span class="sample-chart badge bg-primary" name="' + (self.samplemode === 'table' ? 'graph' : 'table') + '">Näita ' + (self.samplemode === 'table' ? 'Graafikut' : 'Tabelit') + '</span>&nbsp;';
                    s += '</div>';
                    s += '<div class="view-control">';
                    s += '<span class="close-chart badge bg-primary">Sulge</span>&nbsp;';
                    s += '</div></div></div>';
                    el.html(s);
                    var v = self.getWidth(null, el[0]);
                    if (!self.timeframe) {
                        if (v < 400) self.timeframe = 4 * 3600 * 1000;
                        else if (v < 500) self.timeframe = 6 * 3600 * 1000;
                        else if (v < 600) self.timeframe = 12 * 3600 * 1000;
                        else self.timeframe = 24 * 3600 * 1000;
                    }
                    s = '<div class="float two-lg';
                    s += (!xlarge) ? ' ' + (self.viewmode==='est'?'fc':'cur') : ' cur';
                    s += '"><div class="meta"></div></div></div>';
                    if (xlarge) {
                        s += '<div class="float two-lg fc"><div class="meta"></div></div>';
                    }
                    u = $(el).find('.chartbox');
                    u.append(s);
                    self.loadBase(u[0], xlarge ? null : self.viewmode === 'cur' ? 1 : 2);
                    
                    // Now that DOM is built, trigger reload if place was changed
                    if (shouldReload) {
                        self.reloadAfterPlaceChange(oldHProvider, oldFcProvider);
                    }

                    //$('span.title-chart').html(n.name);
                    if (!xlarge) {
                        $('span.change-chart[name="' + self.viewmode + '"]').addClass('label-primary');
                        $('.change-chart').on('click', function(e) {
                            var a = $(this).attr('name');
                            if (a === my.viewmode) return false;
                            self.loadGraph(e, a);
                            self.doReload('both');
                        });
                    } else {
                        $('span.change-chart').css({ display: 'none' });
                    }
                    $('.sample-chart').on('click', function(e) {
                        var a = $(this).attr('name');
                        if (a === my.samplemode) return false;
                        self.loadGraph(e, a);
                        self.doReload('both');
                    });
                    $('.close-chart').on('click', function(e) {
                        self.loadGraph(e, 'closechart');
                        self.doReload('both');
                    });
                    return false;
                },
                modechanged = false;

            if (/(cur|est)$/.test(name)) {
                self.viewmode = name;
                self.state.set({ viewmode: name });
                modechanged = true;
                $('.change-chart').off('click');
                self.changed = 'viewmode';
            } else if (/fctimeframe-\d+$/.test(name)) {
                var c = name.match(/fctimeframe-(\d+)/)[1], b = parseInt(c,10);
                self.state.set({ fctimeframe: b });
                modechanged = true;
                //_.each($('.fc-length'), function(el) { $(el).off('click'); });
                self.changed = 'fctimeframe';
            } else if (/(fcsnt|fcsnf)$/.test(name)) {
                self.fcshownight = name === 'fcsnt' ? true : false;
                self.state.set({ fcshownight: self.fcshownight });
                modechanged = true;
                $('.night-chart').off('click');
                self.changed = 'fcshownight';
            } else if (/(graph|table)$/.test(name)) {
                self.samplemode = name;
                self.state.set({ samplemode: name });
                modechanged = true;
                $('.sample-chart').off('click');
                self.changed = 'samplemode';
            } else {
                o = name;
            }
            if (m.length) {
                if (me && modechanged) { //(me.hasClass('change-chart')||me.hasClass('long-chart'))) {
                    me = m.prev();
                }
                $('.chart-box').each(function(i, a) { $(a).remove(); });
                $('.chartbox').each(function(i, a) { $(a).remove(); });
                
                if (name === 'closechart') {
                    $('.data-menu-row').each(function(b, a) { a.className = a.className.replace(' selected', ''); });
                    self.loadMap();
                    return false;
                }
                if (!modechanged) {
                    self.curplace = o;
                }
            }

            var sampleModes = ['graph', 'table'], container = document.querySelector('.container'), sm;
            sampleModes.forEach(function(name) {
                sm = 'samplemode-' + name;
                if (self.samplemode != name && container && container.classList.contains(sm)) {
                    container.classList.remove(sm);
                }
                else if (self.samplemode === name && container && !container.classList.contains(sm)) {
                    container.classList.add(sm);
                }
            });
            if (me && self.getWidth() < 850) {
                var tmp = me;
                while (tmp && tmp.length && !tmp.hasClass('data-menu-row') && !tmp.hasClass('chart-container')) {
                    tmp = tmp.parent();
                }
                if (tmp && tmp.length) me = tmp;
                if (me.hasClass('data-menu-row')) {
                    var tr = doc.createElement('tr'),
                        td = doc.createElement('td');
                    tr.className = 'chart-box';
                    tr.appendChild(td);
                    td.setAttribute('colspan', '100');
                    $(tr).insertAfter(me);
                    me = $(td);
                }
                return func(me, n);
            } else if (self.getWidth() >= 850) {
                return func($('.chart-container'), n);
            }
            return false;
        },
        dataTableTemplate: '<table class="<%=classes%> ilm-table"><%=thead%><%=tbody%></table>',
        fcHeadTemplate: '<thead><%=inforows%><tr><th scope="col">Aeg</th><th scope="col">Tuul</th><th scope="col">Suund</th><th scope="col">Temp</th><th scope="col">Sadu</th><th scope="col" class="d-xs-none">Rõhk</th></tr></thead>',
        fcRowTemplate: `<tr class="<%=night?"night":""%><%=night&&hide?" hide":""%>">
        <td><span class="day"><%=day%>&nbsp;</span><%=time%></td>
        <td><span class="ws"<%if(wscolor){%> style="color:<%=wscolor%>"<%}%>><%=ws?ws:""%></span><%if(wg){%>/<span class="wg"<%if(wgcolor){%> style="color:<%=wgcolor%>"<%}%>><%=wg%></span><%}%></td>
        <td><span class="arrow <%=dn%>"></span><%=wd?wd:""%></td>
        <td><%=temp?temp:""%></td>
        <td><%=rain?rain:""%></td>
        <td class="d-xs-none"><%=press?press:""%></td></tr>`,
        histHeadTemplate: `<thead><%=inforows%><tr>
        <th scope="col" class="time">Aeg</th>
        <th scope="col" class="avg_ws">Tuul</th>
        <th scope="col" class="avg_wd">Suund</th>
        <th scope="col" class="avg_temp">Temp</th>
        <th scope="col" class="avg_wl">Vesi</th>
        <th scope="col" class="avg_wtemp">Vtemp</th>
        <th scope="col" class="avg_rain">Sadu</th></tr></thead>`,
        histRowTemplate:`<tr class="item <%=night?"night":""%>" id="<%=d.time%>">
        <td><span class="grid-cell-title">Aeg:&nbsp;</span><span class="grid-em"><span class="time"><span class="day"><%=day%>&nbsp;</span><%=date%>&nbsp;</span><span class="time-str"><%=time%></span></span></td>
        <td><span class="grid-cell-title">Tuul:&nbsp;</span><span class="grid-em"><span class="avg_ws" style="color:<%=wscolor%>"><%=d.avg_ws%></span>/<span class="max_ws" style="color:<%=wgcolor%>"><%=d.max_ws%></span></span></td>
        <td class="avg_wd" title="<%=dn%>"><span class="grid-cell-title">Suund:&nbsp;</span><span class="arrow <%=dn%>"></span><span class="grid-em"><%=d.avg_wd%></span></td>
        <td class="avg_temp"><span class="grid-cell-title">Temp:&nbsp;</span><span class="grid-em"><%=d.avg_temp%></span></td>
        <td class="avg_wl"><span class="grid-cell-title">Vesi:&nbsp;</span><span class="grid-em"><%=d.avg_wl%></span></td>
        <td class="avg_wtemp"><span class="grid-cell-title">Vtemp:&nbsp;</span><span class="grid-em"><%=d.avg_wtemp%></span></td>
        <td class="avg_rain"><span class="grid-cell-title">Sadu:&nbsp;</span><span class="grid-em"><%=d.avg_rain%></span></td></tr>`,
        gridHeadTemplate: `<thead><tr>
        <th><span class="data-menu-order change btn btn-sm btn-primary">+</span></th>
        <th class="sortable-is-active d-none"></th>
        <th scope="col" class="avg_ws">Tuul</th>
        <th scope="col" class="avg_wd">Suund</th>
        <th scope="col" class="avg_temp">Temp</th>
        <th scope="col" class="avg_wl">Vesi</th>
        <th scope="col" class="avg_wtemp">Vtemp</th>
        <th scope="col" class="avg_rain">Sadu</th>
        <th scope="col" class="time">Aeg</th></tr></thead>`,
        gridRowTemplate: `<td class="sortable-is-active d-none">-</td>
        <td><span class="grid-em"><%=first%><span class="desc">&nbsp;<%=last%></span></span></td>
        <td><span class="grid-cell-title">Tuul:&nbsp;</span><span class="trend"><%=d.trend=="u"?"&uarr;":d.trend=="d"?"&darr;":"&nbsp;"%>&nbsp;</span><span class="grid-em" style="color:<%=wscolor%>"><span class="avg_ws"><%=d.avg_ws%></span>/<span class="max_ws" style="color:<%=wgcolor%>"><%=d.max_ws%></span></span></td>
        <td class="avg_wd" title="<%=dn%>"><span class="grid-cell-title">Suund:&nbsp;</span><span class="arrow <%=dn%>"></span><span class="grid-em"><%=d.avg_wd%></span></td>
        <td class="avg_temp"><span class="grid-cell-title">Temp:&nbsp;</span><span class="grid-em"><%=d.avg_temp%></span></td>
        <td class="avg_wl"><span class="grid-cell-title">Vesi:&nbsp;</span><span class="grid-em"><%=d.avg_wl%></span></td>
        <td class="avg_wtemp"><span class="grid-cell-title">Vtemp:&nbsp;</span><span class="grid-em"><%=d.avg_wtemp%></span></td>
        <td class="avg_rain"><span class="grid-cell-title">Sademed:&nbsp;</span><span class="grid-em"><%=d.avg_rain%></span></td>
        <td class="time"><span class="grid-cell-title">Aeg:&nbsp;</span><span class="grid-em"><span"><span class="day"><%=day%>&nbsp;</span><span class="date"><%=date%>&nbsp;</span><span class="time-str"><%=time%></span></span></td>`,
        chartContainerTemplate: `<div class="floa-t col-lg-6 col-md-12 col-xs-12"><div class="title btn-group"><a id="curplace" class="btn btn-secondary btn-xs navbar-btn">Andmed <b><%=title%></b></a><a id="curtime" class="btn btn-secondary btn-xs navbar-btn"><%=date%></a><a id="cursel" style="" data-toggle="dropdown" class="btn btn-secondary btn-xs navbar-btn dropdown-toggle"><span class="caret"></span></a><ul id="curmenu" role="menu" class="curmenu dropdown-menu">
        <li><a href="#" name="wsds_saadjarv_saadjarve" class="curplace-select active">Saadjärve Saadjärv</a></li>
        <!--li><a href="#" name="flydog_aksi" class="curplace-select active">Saadjärv Äksi</a></li-->
        <li><a href="#" name="emu" class="curplace-select active">Tartu EMU</a></li>
        <li><a href="#" name="ut_tartu" class="curplace-select">Tartu UT</a></li>
        <li><a href="#" name="wsds_vortsjarv_joesuu" class="curplace-select">Võrtsjärv Jõesuu</a></li>
        <li><a href="#" name="wsds_vortsjarv_tamme" class="curplace-select">Võrtsjärv Tamme</a></li>
        <li><a href="#" name="mnt_tamme" class="curplace-select">V-Rakke MNT</a></li>
        <li><a href="#" name="wsds_peipsi_rapina" class="curplace-select">Peipsi Räpina</a></li>
        <li><a href="#" name="mnt_rapina" class="curplace-select">Räpina MNT</a></li>
        <li><a href="#" name="mnt_uhmardu" class="curplace-select">Uhmardu MNT</a></li>
        <li><a href="#" name="mnt_jogeva" class="curplace-select">Jõgeva MNT</a></li>
        <li><a href="#" name="emhi_pirita" class="curplace-select">Pirita EMHI</a></li>
        <li><a href="#" name="emhi_rohuneeme" class="curplace-select">Püünsi EMHI</a></li>
        <li><a href="#" name="emhi_haapsalu" class="curplace-select">Haapsalu EMHI</a></li>
        <li><a href="#" name="emhi_parnu" class="curplace-select">Pärnu EMHI</a></li>
        <li><a href="#" name="ttu_parnu" class="curplace-select">Pärnu TTU</a></li>
        <li><a href="#" name="emhi_haademeeste" class="curplace-select">Häädemeeste EMHI</a></li>
        <li><a href="#" name="emhi_sorve" class="curplace-select">Sõrve EMHI</a></li>
        <li><a href="#" name="emhi_ristna" class="curplace-select">Ristna EMHI</a></li>
        <li><a href="#" name="emhi_heltermaa" class="curplace-select">Heltermaa EMHI</a></li>
        <li><a href="#" name="ttu_heltermaa" class="curplace-select">Heltermaa TTU</a></li>
        </ul></div>
        <input id="datepicker" type="text" style="visibility:hidden;height:0;width:0;padding:0;margin:0" class="hasDatepicker hist-datepicker"><div class="meta"><div id="curmeta" class="ilm-meta"></div></div></div>`,
        chart2Container: `<div class="float">
        <div class="title btn-group"><a id="fctitle" class="btn btn-secondary btn-xs navbar-btn"><%=title%></a><a id="fcsel" data-toggle="dropdown" class="btn btn-secondary btn-xs navbar-btn dropdown-toggle"><%=date%><span class="caret"></span></a><ul id="fcmenu" role="menu" class="fcmenu dropdown-menu"></ul></div>
        <div class="meta">
        <div id="yrmeta" class="ilm-meta"><a href="http://www.yr.no/place/Estonia/Tartumaa/Äksi/hour_by_hour.html" onclick="window.open(this.href);return false;">Yr.no</a> andmed viimati uuendatud: 26.07.2017 22:32, Järgmine uuendus: 27.07.2017 11:00</div>
        <div id="wgmeta" class="ilm-meta"><a href="http://www.windguru.cz/ee/?go=1&amp;sc=266923&amp;wj=msd&amp;tj=c&amp;fhours=180&amp;odh=3&amp;doh=22" onclick="window.open(this.href);return false;">Windguru.cz</a> andmed viimati uuendatud: 27.07.2017 01:24, Järgmine uuendus: 27.07.2017 01:24</div>
        </div></div>`,
        gridintval: 0,
        getDayLetter: function(date) {
            var day = new Date(date).getDay();
            return this.weekdays[day][0];
        },
        fillGridLast: function(scope, div) {
            var self = scope || this,
                el = null,
                now = new Date();
            if (!div) { div = self.grid_placeholder || 'menu-container'; }
            el = doc.getElementById(div);
            if (el) {
                var func = function(url, n, provider, e) {
                    var $e = $(e);
                    $.ajax({
                        type: 'get',
                        url: url,
                    }).always(function(json, type) {
                        if ((/error|timeout/).test(type)) {
                            $e.addClass('hide');
                        }
                        else {
                            var attachMarkerMessage = function(marker, message) {
                                var infowindow = new w.google.maps.InfoWindow({
                                    content: message,
                                    zIndex: 5000
                                });
                                var isOpen = function(w) {
                                    var map = w.getMap();
                                    return (map !== null && typeof map !== 'undefined');
                                };
                                
                                // Function to open InfoWindow positioned above the custom marker
                                var openInfoWindowAboveMarker = function() {
                                    var markerPos = marker.getPosition();
                                    var map = marker.get('map');
                                    var zoom = map.getZoom();
                                    
                                    // Calculate offset to position above the 30px marker
                                    var scale = Math.pow(2, zoom);
                                    var pixelOffset = 40 / scale; // 40px above the marker in lat/lng units
                                    var offsetLat = pixelOffset / 111320; // Convert pixels to degrees
                                    
                                    var offsetPos = new w.google.maps.LatLng(
                                        markerPos.lat() + offsetLat,
                                        markerPos.lng()
                                    );
                                    
                                    infowindow.setPosition(offsetPos);
                                    infowindow.open(map);
                                };
                                
                                // Add timeout variables to prevent blinking
                                var openTimeout = null;
                                var closeTimeout = null;
                                
                                if (marker && marker.mclick) w.google.maps.event.removeListener(marker.mclick);
                                marker.mclick = marker.addListener('click', function() {
                                    // Clear any pending timeouts on click
                                    if (openTimeout) clearTimeout(openTimeout);
                                    if (closeTimeout) clearTimeout(closeTimeout);
                                    
                                    if (isOpen(infowindow)) {
                                        infowindow.close();
                                        return false;
                                    }
                                    
                                    openInfoWindowAboveMarker();
                                });
                                
                                if (marker && marker.mover) w.google.maps.event.removeListener(marker.mover);
                                marker.mover = marker.addListener('mouseover', function() {
                                    // Clear any pending close timeout
                                    if (closeTimeout) {
                                        clearTimeout(closeTimeout);
                                        closeTimeout = null;
                                    }
                                    
                                    // Only open if not already open, with slight delay to prevent rapid opening
                                    if (!isOpen(infowindow)) {
                                        openTimeout = setTimeout(function() {
                                            openInfoWindowAboveMarker();
                                            openTimeout = null;
                                        }, 150);
                                    }
                                });
                                if (marker && marker.mout) w.google.maps.event.removeListener(marker.mout);
                                marker.mout = marker.addListener('mouseout', function() {
                                    // Clear any pending open timeout
                                    if (openTimeout) {
                                        clearTimeout(openTimeout);
                                        openTimeout = null;
                                    }
                                    
                                    // Close with delay to prevent blinking when mouse quickly moves between markers
                                    if (isOpen(infowindow)) {
                                        closeTimeout = setTimeout(function() {
                                            infowindow.close();
                                            closeTimeout = null;
                                        }, 300);
                                    }
                                });
                            };
                            self.normalizeData(n, provider, json, function(obj) {
                                if (obj) {
                                    var deferred = false,
                                        time = self.getTimeStr(obj.time).split(/\s/),
                                        yr = time[0].split(/\./)[2],
                                        idx = n.name.lastIndexOf(' '),
                                        first = n.name.substring(0, idx + 1),
                                        last = n.name.substring(idx + 1, n.name.length);
                                    if (now.getTime() - obj.time > 6 * 3600000) { deferred = true; }
                                    if (deferred) $e.addClass('deferred');
                                    else $e.removeClass('deferred');
                                    var wsbf = self.bfscale(obj.avg_ws),
                                        wgbf = self.bfscale(obj.max_ws);
                                    $e.html(_.template(self.gridRowTemplate)({
                                        d: obj,
                                        first: first,
                                        last: last,
                                        day: (!deferred) ? self.getDayLetter(obj.time) : '',
                                        date: time[0],
                                        time: (deferred && yr) ? '' : time[1],
                                        dn: self.dirs(obj.avg_wd),
                                        wscolor: wsbf.label.style.color || 'gray',
                                        wgcolor: wgbf.label.style.color || 'gray',
                                        night: false
                                    }));
                                    if (!deferred) {
                                        var elf = $e.find('.avg_ws');
                                        elf.attr('title', wsbf.label.text);
                                        if (self.markers[n.placeKey]) {
                                            var label = self.markers[n.placeKey].getLabel() || {};
                                            label.text = obj.avg_ws ? '' + obj.avg_ws : '0';
                                            label.color = wsbf.label.style.color || 'gray';
                                            label.fontSize = '80%';
                                            label.wd = obj.avg_wd ? obj.avg_wd : 0;
                                            self.markers[n.placeKey].setLabel(label);
                                        }

                                        elf = $e.find('.max_ws');
                                        elf.attr('title', wgbf.label.text);
                                        if (self.markers[n.placeKey]) {
                                            var icon = self.markers[n.placeKey].getIcon() || {};
                                            icon.strokeColor = wgbf.label.style.color || 'gray';
                                            self.markers[n.placeKey].setIcon(icon);
                                            var str = $e.html().replace(/td>/ig, 'div>').replace(/<td/ig, '<div');
                                            //str = '<div>Tuul:'+obj.avg_ws+'/'+obj.max_ws+'</div><div>Suund:'+obj.avg_ws+'/'+obj.max_ws+'</div>';
                                            attachMarkerMessage(self.markers[n.placeKey], '<div class="infowindow">' + str + '</div>');
                                        }
                                        if (obj.avg_temp < 10) $e.find('.avg_temp').addClass('chilli');
                                        setTimeout(function() { $e.find('.time-str').css({ color: 'gray' }); }, 60000);
                                    }
                                }
                            }, 1);
                            $('#pagelogo').html(my.logo + ' <span style="font-size:70%">' + my.getTimeStr(my.getTime()) + '</span>');
                        }
                    });
                };
                // Build a name map for all possible row keys so we can label rows nicely
                // Get available places for display names
                var placeDisplayNames = {};
                for (var pk in self.curplaces) {
                    var place = self.curplaces[pk];
                    if (place) placeDisplayNames[pk] = place.name;
                }
                
                // Update only the rows currently rendered in the grid
                var trs = $('.data-menu-row');
                var viewStates = self.state.attr.viewStates || {};
                
                for (var ti = 0; ti < trs.length; ti++) {
                    var $tr = $(trs[ti]);
                    var placeKey = $tr.attr('name');
                    if (!placeKey || !self.curplaces[placeKey]) continue;
                    
                    // Get provider and station info from viewStates or fallback to defaults
                    var stationInfo = self.getStationInfoForGrid(placeKey, viewStates[placeKey]);
                    if (!stationInfo) continue;
                    
                    var hprovider = stationInfo.hprovider;
                    var stationId = stationInfo.stationId;
                    var displayName = stationInfo.displayName;
                    
                    // Use the raw station ID for URL construction (preserves UTF-8 characters)
                    var rowKey = hprovider + '_' + stationId;
                    var n = { id: rowKey, name: displayName, placeKey: placeKey };
                    var url = self.setHistDataUrl(rowKey) + '?' + now.getTime();
                    // Use simplified grid row ID (only place key)
                    var uniqueId = 'grid-node-' + placeKey;
                    func(url, n, hprovider, '#' + uniqueId);
                }
            }
        },
        colorasbf: function(w, el) {
            var bf = this.bfscale(w);
            if (el) {
                var elf = $(el);
                elf.css('color', bf.label.style.color);
                elf.attr('title', bf.label.text);
                return false;
            } else {
                return { color: bf.label.style.color, title: bf.label.text };
            }
        },
        dirs: function(dir) {
            if ((dir >= 0 && dir <= 11.25) || (dir >= 348.75 && dir <= 360)) { return 'n'; }
            if ((dir > 11.25 && dir <= 33.75)) { return 'nne'; }
            if ((dir > 33.75 && dir <= 56.25)) { return 'ne'; }
            if ((dir > 56.25 && dir <= 78.75)) { return 'ene'; }
            if ((dir > 78.75 && dir <= 101.25)) { return 'e'; }
            if ((dir > 101.25 && dir <= 123.75)) { return 'ese'; }
            if ((dir > 123.75 && dir <= 146.25)) { return 'se'; }
            if ((dir > 146.25 && dir <= 168.75)) { return 'sse'; }
            if ((dir > 168.75 && dir <= 191.25)) { return 's'; }
            if ((dir > 191.25 && dir <= 213.75)) { return 'ssw'; }
            if ((dir > 213.75 && dir <= 236.25)) { return 'sw'; }
            if ((dir > 236.25 && dir <= 258.75)) { return 'wsw'; }
            if ((dir > 258.75 && dir <= 281.25)) { return 'w'; }
            if ((dir > 281.25 && dir <= 303.75)) { return 'wnw'; }
            if ((dir > 303.75 && dir <= 326.25)) { return 'nw'; }
            if ((dir > 326.25 && dir <= 348.75)) { return 'nnw'; }
        },
        bfscale: function(ws) {
            if (!ws) {
                return { id: 1000, color: '#bababa', label: { style: { color: 'rgba(146, 147, 148, 1)' } } };
            }
            if (ws < 0.3) {
                return {
                    id: 0,
                    from: 0,
                    to: 0.3,
                    color: 'rgba(68, 170, 213, 0.1)',
                    label: { text: 'tuulevaikus', style: { color: 'rgba(146, 147, 148, 1)' } }
                };
            }
            if (ws >= 0.3 && ws < 1.6) {
                return {
                    id: 1,
                    from: 0.3,
                    to: 1.5,
                    color: 'rgba(68, 170, 213, 0.1)',
                    label: { text: 'vaikne tuul', style: { color: 'rgba(146, 147, 148, 1)' } }
                };
            }
            if (ws >= 1.6 && ws < 3.3) { // Light breeze
                return {
                    id: 2,
                    from: 1.5,
                    to: 3.3,
                    color: 'rgba(0, 0, 0, 0)',
                    label: { text: 'kerge tuul', style: { color: 'rgba(97, 98, 98, 1)' } }
                };
            }
            if (ws >= 3.3 && ws < 5.5) { // Gentle breeze
                return {
                    id: 3,
                    from: 3.3,
                    to: 5.5,
                    color: 'rgba(68, 170, 213, 0.1)',
                    label: { text: 'nõrk tuul', style: { color: 'rgba(202, 126, 97, 1)' } }
                };
            }
            if (ws >= 5.5 && ws < 8) { // Moderate breeze
                return {
                    id: 4,
                    from: 5.5,
                    to: 8,
                    color: 'rgba(0, 0, 0, 0)',
                    label: { text: 'mõõdukas tuul', style: { color: 'rgba(25, 174, 49, 1)' } }
                };
            }
            if (ws >= 8 && ws < 11) { // Fresh breeze
                return {
                    id: 5,
                    from: 8,
                    to: 11,
                    color: 'rgba(68, 170, 213, 0.1)',
                    label: { text: 'üsna tugev tuul', style: { color: 'rgba(22, 62, 205, 1)' } }
                };
            }
            if (ws >= 11 && ws < 14) { // Strong breeze
                return {
                    id: 6,
                    from: 11,
                    to: 14,
                    color: 'rgba(0, 0, 0, 0)',
                    label: { text: 'tugev tuul', style: { color: 'rgba(193, 18, 205, 1)' } }
                };
            }
            if (ws >= 14 && ws < 17.2) { // High wind
                return {
                    id: 7,
                    from: 14,
                    to: 17.2,
                    color: 'rgba(68, 170, 213, 0.1)',
                    label: { text: 'vali tuul', style: { color: 'rgba(205, 14, 8, 1)' } }
                };
            }
            if (ws >= 17.2 && ws < 20.7) { // <21 Fresh gale
                return {
                    id: 8,
                    from: 17.2,
                    to: 20.7,
                    color: 'rgba(0, 0, 0, 0)',
                    label: { text: 'tormine tuul', style: { color: 'rgba(159, 16, 84, 1)' } }
                };
            }
            if (ws >= 20.7 && ws < 24.5) {
                return {
                    id: 9,
                    from: 20.7,
                    to: 24.5,
                    color: 'rgba(0, 0, 0, 0)',
                    label: { text: 'torm', style: { color: '#FF9900' } }
                };
            }
            if (ws >= 24.5) {
                return {
                    id: 10,
                    from: 24.5,
                    to: 28.4,
                    color: 'rgba(0, 0, 0, 0)',
                    label: { text: 'tugev torm', style: { color: '#FF6600' } }
                };
            }
        },
        ntof2p: function(input) {
            if (input === '-' || input === '' || input === null || input === undefined || input === 'nan') { return null; }
            if (Object.prototype.toString.call(input) === '[object String]' && (/^0(\d+\.)/).test(input)) input = input.replace(/^0(\d+\.)/, '-$1');
            return parseFloat(parseFloat(input).toFixed(1));
        },
        conv_kmh2ms: function(input) {
            if (input === '-' || input === '' || input === null || input === undefined || input === 'nan') { return null; }
            var t = (parseFloat(input) * 1000) / 3600;
            return parseFloat(t.toFixed(1));
        },
        conv_mh2ms: function(input) {
            if (input === '-' || input === '' || input === null || input === undefined || input === 'nan') { return null; }
            var t = parseFloat(input) / 2.23693629;
            return parseFloat(t.toFixed(1));
        },
        conv_knot2ms: function(input) {
            if (input === '-' || input === '' || input === null || input === undefined || input === 'nan') { return null; }
            var t = parseFloat(input) / 1.9426;
            return parseFloat((t + (t * 0.000639)).toFixed(1));
        },
        conv_ms2knots: function(input) {
            if (input === '-' || input === '' || input === null || input === undefined || input === 'nan') { return null; }
            var t = parseFloat(input) / 0.515;
            return parseFloat((t + (t * 0.000639)).toFixed(1));
        },
        getWidth: function(i, el) {
            i = i || null;
            return (el && el.clientWidth) ? el.clientWidth : (w.innerWidth) ? w.innerWidth :
                (doc.documentElement && doc.documentElement.clientWidth) ? doc.documentElement.clientWidth :
                    (doc.body && doc.body.clientWidth) ? doc.body.clientWidth : i;
        },
        wdavg: function(wd, ws) {
            if (Object.prototype.toString.call(wd) !== '[object Array]') {
                return 0;
            }
            ws = ws || [];
            var i = 0,
                sins = 0,
                coss = 0,
                count = wd.length,
                num = count,
                c = 0,
                ac = 0,
                as = 0;
            for (; i < count; ++i) {
                if (wd[i] === '-' || wd[i] === '' || wd[i] === null || wd[i] === undefined) {--num; continue; }
                sins += (ws[i] ? ws[i] : 1) * Math.sin(wd[i] * Math.PI / 180);
                coss += (ws[i] ? ws[i] : 1) * Math.cos(wd[i] * Math.PI / 180);
            }
            as = (-1 * (1 / num) * sins);
            ac = (-1 * (1 / num) * coss);
            if (as === 0) {
                if (ac < 0) c = 0;
                else if (ac > 0) c = 180;
                else c = 0;
            } else {
                c = 90 - (Math.atan(ac / as) * 180 / Math.PI);
                if (as > 0) c += 180;
            }
            return c ? parseFloat(c.toFixed(1)) : 0;
        },
        getavg: function(input) {
            if (Object.prototype.toString.call(input) !== '[object Array]') {
                return 0;
            }
            var i = 0,
                j = input.length,
                num = j,
                sum = 0;
            for (; i < j; i++) {
                if (input[i] === '-' || input[i] === '' || input[i] === null || input[i] === undefined) {--num; continue; }
                if (Object.prototype.toString.call(input[i]) === '[object String]' && (/^0(\d+\.)/).test(input[i])) input[i] = input[i].replace(/^0(\d+\.)/, '-$1');
                sum += parseFloat(input[i]);
            }
            if (!num) return null;
            return parseFloat((sum / num).toFixed(1));
        },
        getmax: function(input) {
            if (Object.prototype.toString.call(input) !== '[object Array]') {
                return 0;
            }
            var i = 0,
                j = input.length,
                num = j,
                k = 0,
                max = 0;
            for (; i < j; i++) {
                if (input[i] === '-' || input[i] === '' || input[i] === null || input[i] === undefined) {--num; continue; }
                k = parseFloat(input[i]);
                if (max < k) max = k;
            }
            if (!num) return null;
            return max;
        },
        setFrame: function(d, persist, load) {
            if(d) {
                var x = '';
                persist = persist !== 'ei';
                load = load !== 'ei';
                if (d && (/^\d+[dp]/).test(d)) {
                    x = d.replace(/[dp]*$/, '');
                    this.timeframe = x * 24 * 3600 * 1000;
                } else if (d && (/^\d+[ht]/).test(d)) {
                    x = d.replace(/[ht]*$/, '');
                    this.timeframe = x * 3600 * 1000;
                } else if (d && (/^\d+$/).test(d)) {
                    this.timeframe = d;
                }
                if (persist) this.state.set({ 'timeframe': this.timeframe });
                else if (!d) this.timeframe = this.state.attr.timeframe;
                if (load) this.doReload('curplace');
            }
            return false;
        },
        getFrame: function() {
            var f = parseInt(this.timeframe, 10),
                t = f / (24 * 3600 * 1000);
            if (t % 1 === 0) {
                return t + 'd';
            }
            t = f / (3600 * 1000);
            if (t % 1 === 0) {
                return t + 'h';
            }
            return f;
        },
        setTxtFileName: function(d) {
            if (d) {
                d = new Date(d);
                var daystr = d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
                return 'ARC-' + daystr + '.txt';
            }
            return 'last.txt';
        },
        // Parse a row key of form "source_id" into parts
        parseRowKey: function(rowKey) {
            if (typeof rowKey !== 'string') return null;
            var idx = rowKey.indexOf('_');
            if (idx === -1) return {source: this.getCurrentHProvider(), id: rowKey};
            return { source: rowKey.substring(0, idx), id: rowKey.substring(idx + 1) };
        },
        getDateString: function(d, e) {
            if (!d) d = new Date();
            if (typeof d !== 'object') d = new Date(d);
            
            var year = d.getFullYear();
            var month = (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1);
            var day = (d.getDate() < 10 ? '0' : '') + d.getDate();
            if(e){
                var hours = (d.getHours() < 10 ? '0' : '') + d.getHours();
                var minutes = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
                var seconds = (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();
                return year + '-' + month + '-' + day + 'T' + hours + '.' + minutes + '.' + seconds;
            }
            else 
                return day + '.' + month + '.' + year;
        },
        setHistDataUrl: function(place, d) {
            var self = this;
            // If place is a row key like "emhi_dirhami" use it directly
            var parsed = this.parseRowKey(place) || place;
            var dirext = '_data' + (my.useNewHistPlaces ? '_new' : '');
            if (my.getProviderNum(parsed) === my.HPROVIDER.UT || /^ut/.test(place)) {
                return [self.datadir, 'ut_data/tartu', self.setTxtFileName(d)].join('/');
            } else if (my.getProviderNum(parsed) === my.HPROVIDER.EMU || /emu/.test(place)) {
                return [self.datadir, 'emu_data/tartu', self.setTxtFileName(d)].join('/');
            } else if (parsed && parsed.source) {
                var dir = parsed.source;
                var name = this.resolveRawId(parsed.source, parsed.id, place);
                return [self.datadir, (dir + dirext), encodeURIComponent(name), self.setTxtFileName(d)].join('/');
            }
            
            return place.replace(/^(\w+)_(.*)$/, function(match, dir, name) {
                return [self.datadir, (dir + dirext), encodeURIComponent(name), self.setTxtFileName(d)].join('/');
            });
        
        },
        // Update available historical providers for current place
        // Get available historical stations for current place
        getAvailableHStations: function() {
            var stations = [];
            if (!this.curplace || !this.curplaces[this.curplace]) return stations;
            
            var place = this.curplaces[this.curplace];
            var sources = this.useNewHistPlaces ? place.hstations_new : place.hstations;
            
            if (sources && typeof sources === 'object') {
                for (var provider in sources) {
                    var stationList = this.normalizeHistValue(sources[provider]);
                    for (var i = 0; i < stationList.length; i++) {
                        var station = stationList[i];
                        if (station && station.id) {
                            stations.push({
                                provider: provider,
                                id: station.id,
                                name: station.name || station.id,
                                location: station.location,
                                ingrid: !!station.ingrid
                            });
                        }
                    }
                }
            }
            return stations;
        },
        updateHProvidersAvailable: function() {
            this.hproviders_available = [];
            if (this.curplace && this.curplaces[this.curplace]) {
                var place = this.curplaces[this.curplace];
                var sources = [];
                if (this.useNewHistPlaces && place.hstations_new && typeof place.hstations_new === 'object') {
                    sources = sources.concat(Object.keys(place.hstations_new));
                } else if (!this.useNewHistPlaces && place.hstations && typeof place.hstations === 'object') {
                    sources = sources.concat(Object.keys(place.hstations));
                }
                // Remove duplicates
                this.hproviders_available = sources.filter(function(item, pos) {
                    return sources.indexOf(item) === pos;
                });
            }
            return this.hproviders_available;
        },
        
        // Update available forecast providers for current place
        updateFcProvidersAvailable: function() {
            this.fcproviders_available = [];
            if (this.curplace && this.curplaces[this.curplace]) {
                var place = this.curplaces[this.curplace];
                if (place.fcstations && typeof place.fcstations === 'object') {
                    this.fcproviders_available = Object.keys(place.fcstations);
                }
            }
            return this.fcproviders_available;
        },
        
        // Get available forecast stations for current place
        getAvailableFcStations: function() {
            var stations = [];
            if (!this.curplace || !this.curplaces[this.curplace]) return stations;
            
            var place = this.curplaces[this.curplace];
            if (place.fcstations && typeof place.fcstations === 'object') {
                for (var provider in place.fcstations) {
                    var stationList = this.normalizeHistValue(place.fcstations[provider]);
                    for (var i = 0; i < stationList.length; i++) {
                        var station = stationList[i];
                        if (station && station.id) {
                            stations.push({
                                provider: provider,
                                id: station.id,
                                name: station.name || station.id,
                                location: station.location,
                                group: station.group
                            });
                        }
                    }
                }
            }
            return stations;
        },
        
        // Enhanced setFcProvider - uses new forecast station system when available, falls back to old system
        setFcProvider: function(provider, persist) {
            persist = persist !== 'ei';
            if (this.fcproviders_available.indexOf(provider) === -1) return false;
            var currentProvider = this.getCurrentFcProvider();
            if (provider !== currentProvider) {
                // Update fcplace to respect array indices for the new provider
                this.updateFcPlace(persist, provider);
                if (persist) {
                    this.saveViewState(this.curplace);
                }
            }
            return true;
        },
        
        // Get historical station object based on station ID
        getHistStationById: function(stationId, provider, place) {
            provider = provider || this.getCurrentHProvider();
            place = place || this.curplaces[this.curplace];
            var sources = this.useNewHistPlaces ? place.hstations_new : place.hstations;
            if (!stationId || !provider || !place || !sources || !sources[provider]) {
                return null;
            }
            
            var stationList = this.normalizeHistValue(sources[provider]);
            return stationList.find(function(s) { return s.id === stationId; });
        },
        
        // Get forecast station object based on station ID
        getFcStationById: function(stationId, provider, place) {
            provider = provider || this.getCurrentFcProvider();
            place = place || this.curplaces[this.curplace];
            
            if (!stationId || !provider || !place || !place.fcstations || !place.fcstations[provider]) {
                return null;
            }
            
            var stationList = this.normalizeHistValue(place.fcstations[provider]);
            return stationList.find(function(s) { return s.id === stationId; });
        },
        
        setFcPlace: function() {
            return false;
        },

        // Update fcplace based on current fcprovider and curplace
        updateFcPlace: function(persist, provider) {
            persist = persist !== 'ei';
            provider = provider || this.getCurrentFcProvider();
            if (!this.curplace || !this.curplaces[this.curplace] || !provider) {
                return;
            }
            var place = this.curplaces[this.curplace];
            if (place.fcstations && place.fcstations[provider]) {
                var stationList = this.normalizeHistValue(place.fcstations[provider]);
                var targetStation = null;
                
                // Check if we have a saved viewState
                var viewStates = this.state.attr.viewStates || {};
                var savedState = viewStates[this.curplace];
                
                // Case 1: Provider matches saved state - try to restore saved station
                if (savedState && savedState.fcprovider === provider && savedState.fcstation_id) {
                    // Try saved index first if available
                    if (typeof savedState.fcstation_index === 'number' && 
                        savedState.fcstation_index >= 0 && 
                        savedState.fcstation_index < stationList.length &&
                        stationList[savedState.fcstation_index].id === savedState.fcstation_id) {
                        targetStation = stationList[savedState.fcstation_index];
                    } else {
                        // Fallback to finding by ID
                        targetStation = stationList.find(function(s) { return s.id === savedState.fcstation_id; });
                    }
                }
                
                // Case 2: Provider changed, no saved state, or saved station not found - use first station
                if (!targetStation && stationList.length > 0) {
                    targetStation = stationList[0];
                    
                    // If provider changed from saved state, we should update the saved state
                    if (savedState && savedState.fcprovider && savedState.fcprovider !== provider) {
                        // Provider changed - reset to first station and update saved state
                        savedState.fcprovider = provider;
                        savedState.fcstation_id = targetStation.id;
                        savedState.fcstation_index = 0;
                    }
                }
                
                // Store the selection in viewState (not in this.fcplace)
                if (targetStation && persist) {
                    if (!this.state.attr.viewStates) {
                        this.state.attr.viewStates = {};
                    }
                    if (!this.state.attr.viewStates[this.curplace]) {
                        this.state.attr.viewStates[this.curplace] = {};
                    }
                    this.state.attr.viewStates[this.curplace].fcprovider = provider;
                    this.state.attr.viewStates[this.curplace].fcstation_id = targetStation.id;
                    this.state.attr.viewStates[this.curplace].fcstation_index = stationList.indexOf(targetStation);
                }
            }
            if (persist) {
                this.saveViewState(this.curplace);
            }
            return false;
        },
        
        // Set historical provider and update hplace to the corresponding station
        setHProvider: function(provider, persist) {
            persist = persist !== 'ei';
            if (this.hproviders_available.indexOf(provider) === -1) return false;
            var currentProvider = this.getCurrentHProvider();
            if (provider !== currentProvider) {
                // Update hplace to respect array indices for the new provider
                this.updateHPlace(persist, provider);
                if (persist) {
                    this.saveViewState(this.curplace);
                }
            }
            return true;
        },
        // Update hplace based on current hprovider and curplace
        updateHPlace: function(persist, provider) {
            persist = persist !== 'ei';
            provider = provider || this.getCurrentHProvider();
            if (!this.curplace || !this.curplaces[this.curplace] || !provider) {
                return;
            }
            var place = this.curplaces[this.curplace];
            var stations = this.useNewHistPlaces ? place.hstations_new : place.hstations;
            if (stations && stations[provider]) {
                var stationList = this.normalizeHistValue(stations[provider]);
                var targetStation = null;
                
                // Check if we have a saved viewState
                var viewStates = this.state.attr.viewStates || {};
                var savedState = viewStates[this.curplace];
                
                // Case 1: Provider matches saved state - try to restore saved station
                if (savedState && savedState.hprovider === provider && savedState.hstation_id) {
                    // Try saved index first if available
                    if (typeof savedState.hstation_index === 'number' && 
                        savedState.hstation_index >= 0 && 
                        savedState.hstation_index < stationList.length &&
                        stationList[savedState.hstation_index].id === savedState.hstation_id) {
                        targetStation = stationList[savedState.hstation_index];
                    } else {
                        // Fallback to finding by ID
                        targetStation = stationList.find(function(s) { return s.id === savedState.hstation_id; });
                    }
                }
                
                // Case 2: Provider changed, no saved state, or saved station not found - use first station
                if (!targetStation && stationList.length > 0) {
                    targetStation = stationList[0];
                    
                    // If provider changed from saved state, we should update the saved state
                    if (savedState && savedState.hprovider && savedState.hprovider !== provider) {
                        // Provider changed - reset to first station and update saved state
                        savedState.hprovider = provider;
                        savedState.hstation_id = targetStation.id;
                        savedState.hstation_index = 0;
                    }
                }
                
                // Store the selection in viewState (not in this.hplace)
                if (targetStation && persist) {
                    if (!this.state.attr.viewStates) {
                        this.state.attr.viewStates = {};
                    }
                    if (!this.state.attr.viewStates[this.curplace]) {
                        this.state.attr.viewStates[this.curplace] = {};
                    }
                    this.state.attr.viewStates[this.curplace].hprovider = provider;
                    this.state.attr.viewStates[this.curplace].hstation_id = targetStation.id;
                    this.state.attr.viewStates[this.curplace].hstation_index = stationList.indexOf(targetStation);
                }
            }
            if (persist) {
                this.saveViewState(this.curplace);
            }
        },
        
        // Set specific station index within the current provider's array
        setHStationIndex: function(index, persist) {
            persist = persist !== 'ei';
            var currentProvider = this.getCurrentHProvider();
            if (!this.curplace || !this.curplaces[this.curplace] || !currentProvider) {
                return false;
            }
            
            var place = this.curplaces[this.curplace];
            var stations = this.useNewHistPlaces ? place.hstations_new : place.hstations;
            if (!stations || !stations[currentProvider]) {
                return false;
            }
            
            var stationList = this.normalizeHistValue(stations[currentProvider]);
            if (typeof index !== 'number' || index < 0 || index >= stationList.length) {
                return false;
            }
            
            var targetStation = stationList[index];
            if (targetStation && targetStation.id) {
                if (persist) {
                    // Update viewState with the specific index
                    var viewStates = this.state.attr.viewStates || {};
                    if (!viewStates[this.curplace]) {
                        viewStates[this.curplace] = {};
                    }
                    var provider = this.getCurrentHProvider();
                    viewStates[this.curplace].hprovider = provider;
                    viewStates[this.curplace].hstation_id = targetStation.id;
                    viewStates[this.curplace].hstation_index = index;
                    this.saveViewState(this.curplace);
                }
                return true;
            }
            
            return false;
        },
        
        // Get available stations for current provider as array with indices
        getAvailableHStationsForCurrentProvider: function() {
            var provider = this.getCurrentHProvider();
            if (!this.curplace || !this.curplaces[this.curplace] || !provider) {
                return [];
            }
            
            var place = this.curplaces[this.curplace];
            var stations = this.useNewHistPlaces ? place.hstations_new : place.hstations;
            if (!stations || !stations[provider]) {
                return [];
            }
            
            var stationList = this.normalizeHistValue(stations[provider]);
            return stationList.map(function(station, index) {
                return {
                    index: index,
                    id: station.id,
                    name: station.name || place.name,
                    displayName: (station.name || place.name) + ' ' + ((provider === 'wsds') ? 'WS' : provider.toUpperCase()) + (stationList.length > 1 ? ' #' + (index + 1) : ''),
                    station: station
                };
            });
        },
        
        // Get current historical provider structure with station info and index
        getCurrentHProviderStruct: function(placeKey) {
            placeKey = placeKey || this.curplace;
            if (!placeKey || !this.curplaces[placeKey]) {
                return null;
            }
            
            var viewStates = this.state.attr.viewStates || {};
            var savedState = viewStates[placeKey];
            var place = this.curplaces[placeKey];
            
            // Get current provider
            var provider = this.getCurrentHProvider(placeKey);
            if (!provider) return null;
            
            var sources = this.useNewHistPlaces ? place.hstations_new : place.hstations;
            if (!sources || !sources[provider]) return null;
            
            var stationList = this.normalizeHistValue(sources[provider]);
            if (stationList.length === 0) return null;
            
            var result = {
                provider: provider,
                stations: stationList,
                currentStation: null,
                currentIndex: 0
            };
            
            // If we have saved state, try to find the exact station and index
            if (savedState && savedState.hprovider === provider && savedState.hstation_id) {
                // Try saved index first if available
                if (typeof savedState.hstation_index === 'number' && 
                    savedState.hstation_index >= 0 && 
                    savedState.hstation_index < stationList.length &&
                    stationList[savedState.hstation_index].id === savedState.hstation_id) {
                    
                    result.currentStation = stationList[savedState.hstation_index];
                    result.currentIndex = savedState.hstation_index;
                } else {
                    // Find by ID if index doesn't match
                    for (var i = 0; i < stationList.length; i++) {
                        if (stationList[i].id === savedState.hstation_id) {
                            result.currentStation = stationList[i];
                            result.currentIndex = i;
                            break;
                        }
                    }
                }
            }
            
            // If no saved state or station not found, use first station
            if (!result.currentStation && stationList.length > 0) {
                result.currentStation = stationList[0];
                result.currentIndex = 0;
            }
            
            return result;
        },
        
        // Get current forecast provider structure with station info and index
        getCurrentFcProviderStruct: function(placeKey) {
            placeKey = placeKey || this.curplace;
            if (!placeKey || !this.curplaces[placeKey]) {
                return null;
            }
            
            var viewStates = this.state.attr.viewStates || {};
            var savedState = viewStates[placeKey];
            var place = this.curplaces[placeKey];
            
            // Get current provider
            var provider = this.getCurrentFcProvider(placeKey);
            if (!provider) return null;
            
            if (!place.fcstations || !place.fcstations[provider]) return null;
            
            var stationList = this.normalizeHistValue(place.fcstations[provider]);
            if (stationList.length === 0) return null;
            
            var result = {
                provider: provider,
                stations: stationList,
                currentStation: null,
                currentIndex: 0
            };
            
            // If we have saved state, try to find the exact station and index
            if (savedState && savedState.fcprovider === provider && savedState.fcstation_id) {
                // Try saved index first if available
                if (typeof savedState.fcstation_index === 'number' && 
                    savedState.fcstation_index >= 0 && 
                    savedState.fcstation_index < stationList.length &&
                    stationList[savedState.fcstation_index].id === savedState.fcstation_id) {
                    
                    result.currentStation = stationList[savedState.fcstation_index];
                    result.currentIndex = savedState.fcstation_index;
                } else {
                    // Find by ID if index doesn't match
                    for (var i = 0; i < stationList.length; i++) {
                        if (stationList[i].id === savedState.fcstation_id) {
                            result.currentStation = stationList[i];
                            result.currentIndex = i;
                            break;
                        }
                    }
                }
            }
            
            // If no saved state or station not found, use first station
            if (!result.currentStation && stationList.length > 0) {
                result.currentStation = stationList[0];
                result.currentIndex = 0;
            }
            
            return result;
        },
        
        // Helper to get current historical provider from viewStates or fallback
        getCurrentHProvider: function(placeKey) {
            placeKey = placeKey || this.curplace;
            if (!placeKey) return '';
            
            var viewStates = this.state.attr.viewStates || {};
            var savedState = viewStates[placeKey];
            
            if (savedState && savedState.hprovider) {
                return savedState.hprovider;
            }
            
            // Fallback to first available provider for this place
            if (this.curplaces[placeKey]) {
                var place = this.curplaces[placeKey];
                var sources = this.useNewHistPlaces ? place.hstations_new : place.hstations;
                if (sources && typeof sources === 'object') {
                    var providers = Object.keys(sources);
                    if (providers.length > 0) {
                        return providers[0];
                    }
                }
            }
            
            return '';
        },
        
        // Helper to get current forecast provider from viewStates or fallback
        getCurrentFcProvider: function(placeKey) {
            placeKey = placeKey || this.curplace;
            if (!placeKey) return '';
            
            var viewStates = this.state.attr.viewStates || {};
            var savedState = viewStates[placeKey];
            
            if (savedState && savedState.fcprovider) {
                return savedState.fcprovider;
            }
            
            // Fallback to first available provider for this place
            if (this.curplaces[placeKey]) {
                var place = this.curplaces[placeKey];
                if (place.fcstations && typeof place.fcstations === 'object') {
                    var providers = Object.keys(place.fcstations);
                    if (providers.length > 0) {
                        return providers[0];
                    }
                }
            }
            
            return '';
        },
        
        // View state persistence system for place-specific provider/station selections
        saveViewState: function(placeKey) {
            if (!placeKey) placeKey = this.curplace;
            if (!placeKey || !this.curplaces[placeKey]) return;
            
            // Ensure viewStates exists in state
            if (!this.state.attr.viewStates) {
                this.state.attr.viewStates = {};
            }
            
            // Update timestamp in existing state (state is updated by updateHPlace/updateFcPlace)
            if (!this.state.attr.viewStates[placeKey]) {
                this.state.attr.viewStates[placeKey] = {};
            }
            this.state.attr.viewStates[placeKey].timestamp = Date.now();
            
            this.state.save(); // Trigger save directly
            
            // Update the existing grid row if it exists, without full reload
            this.updateGridRowForPlace(placeKey);
        },
        
        restoreViewState: function(placeKey) {
            if (!placeKey || !this.curplaces[placeKey]) return false;
            
            var viewStates = this.state.attr.viewStates || {};
            var savedState = viewStates[placeKey];
            
            if (!savedState) return false;
            
            var restored = false;
            var place = this.curplaces[placeKey];
            
            // Restore historical provider/station if available and valid
            if (savedState.hprovider && savedState.hstation_id && 
                this.hproviders_available.indexOf(savedState.hprovider) !== -1) {
                
                var hStations = this.useNewHistPlaces ? place.hstations_new : place.hstations;
                if (hStations && hStations[savedState.hprovider]) {
                    var hStationList = this.normalizeHistValue(hStations[savedState.hprovider]);
                    var hStation = null;
                    
                    // If we have a saved index, try that first
                    if (typeof savedState.hstation_index === 'number' && 
                        savedState.hstation_index >= 0 && 
                        savedState.hstation_index < hStationList.length &&
                        hStationList[savedState.hstation_index].id === savedState.hstation_id) {
                        hStation = hStationList[savedState.hstation_index];
                    } else {
                        // Fallback to finding by ID
                        hStation = hStationList.find(function(s) { return s.id === savedState.hstation_id; });
                    }
                    
                    if (hStation) {
                        // Use setHStationIndex to properly set both hplace and track the index
                        if (typeof savedState.hstation_index === 'number' && 
                            savedState.hstation_index >= 0 && 
                            savedState.hstation_index < hStationList.length &&
                            hStationList[savedState.hstation_index] === hStation) {
                            this.setHStationIndex(savedState.hstation_index, false);
                        } else {
                            // Find the actual index and use setHStationIndex
                            var actualIndex = hStationList.findIndex(function(s) { return s.id === savedState.hstation_id; });
                            if (actualIndex !== -1) {
                                this.setHStationIndex(actualIndex, false);
                            }
                        }
                        restored = true;
                    }
                }
            }
            
            // Restore forecast provider/station if available and valid
            if (savedState.fcprovider && savedState.fcstation_id &&
                this.fcproviders_available.indexOf(savedState.fcprovider) !== -1) {
                
                if (place.fcstations && place.fcstations[savedState.fcprovider]) {
                    var fcStationList = this.normalizeHistValue(place.fcstations[savedState.fcprovider]);
                    var fcStation = null;
                    
                    // If we have a saved index, try that first
                    if (typeof savedState.fcstation_index === 'number' && 
                        savedState.fcstation_index >= 0 && 
                        savedState.fcstation_index < fcStationList.length &&
                        fcStationList[savedState.fcstation_index].id === savedState.fcstation_id) {
                        fcStation = fcStationList[savedState.fcstation_index];
                    } else {
                        // Fallback to finding by ID
                        fcStation = fcStationList.find(function(s) { return s.id === savedState.fcstation_id; });
                    }
                    
                    if (fcStation) {
                        // fcStation found - state will be restored by getCurrentFcProviderStruct
                        restored = true;
                    }
                }
            }
            
            return restored;
        },
        
        clearViewState: function(placeKey) {
            if (!placeKey) placeKey = this.curplace;
            if (!placeKey) return;
            
            if (this.state.attr.viewStates && this.state.attr.viewStates[placeKey]) {
                delete this.state.attr.viewStates[placeKey];
                this.state.save(); // Trigger save directly
            }
        },
        
        // Get saved view state for a place - useful for loadGraph to recreate graphs/tables
        getSavedViewState: function(placeKey) {
            if (!placeKey) placeKey = this.curplace;
            if (!placeKey) return null;
            
            var viewStates = this.state.attr.viewStates || {};
            var savedState = viewStates[placeKey];
            
            if (!savedState) return null;
            
            var place = this.curplaces[placeKey];
            if (!place) return null;
            
            var result = {
                placeKey: placeKey,
                place: place,
                timestamp: savedState.timestamp
            };
            
            // Restore historical station object from ID
            if (savedState.hprovider && savedState.hstation_id) {
                var hStations = this.useNewHistPlaces ? place.hstations_new : place.hstations;
                if (hStations && hStations[savedState.hprovider]) {
                    var hStationList = this.normalizeHistValue(hStations[savedState.hprovider]);
                    var hStation = null;
                    
                    // If we have a saved index, try that first
                    if (typeof savedState.hstation_index === 'number' && 
                        savedState.hstation_index >= 0 && 
                        savedState.hstation_index < hStationList.length &&
                        hStationList[savedState.hstation_index].id === savedState.hstation_id) {
                        hStation = hStationList[savedState.hstation_index];
                    } else {
                        // Fallback to finding by ID
                        hStation = hStationList.find(function(s) { return s.id === savedState.hstation_id; });
                    }
                    
                    if (hStation) {
                        result.hprovider = savedState.hprovider;
                        result.hstation = hStation;
                    }
                }
            }
            
            // Restore forecast station object from ID
            if (savedState.fcprovider && savedState.fcstation_id) {
                if (place.fcstations && place.fcstations[savedState.fcprovider]) {
                    var fcStationList = this.normalizeHistValue(place.fcstations[savedState.fcprovider]);
                    var fcStation = null;
                    
                    // If we have a saved index, try that first
                    if (typeof savedState.fcstation_index === 'number' && 
                        savedState.fcstation_index >= 0 && 
                        savedState.fcstation_index < fcStationList.length &&
                        fcStationList[savedState.fcstation_index].id === savedState.fcstation_id) {
                        fcStation = fcStationList[savedState.fcstation_index];
                    } else {
                        // Fallback to finding by ID
                        fcStation = fcStationList.find(function(s) { return s.id === savedState.fcstation_id; });
                    }
                    
                    if (fcStation) {
                        result.fcprovider = savedState.fcprovider;
                        result.fcstation = fcStation;
                    }
                }
            }
            
            return result;
        },
        
        setCurPlace: function(d, persist, load) {
            persist = persist === true || persist === 'ja' ? 'ja' : 'ei';
            
            this.setPlace(d, 'curplace', persist);

            // Update available providers for current place
            this.updateHProvidersAvailable();
            this.updateFcProvidersAvailable();
            
            // If place changed, try to restore previous view state
            var stateRestored = this.restoreViewState(this.curplace);
            
            if (!stateRestored) {
                // If no saved state, use default provider selection logic
                
                // Historical provider fallback
                var currentHProvider = this.getCurrentHProvider();
                if (this.hproviders_available.length > 0 && this.hproviders_available.indexOf(currentHProvider) === -1) {
                    this.setHProvider(this.hproviders_available[0], persist !== 'ei');
                }
                
                // Forecast provider fallback  
                var currentFcProvider = this.getCurrentFcProvider();
                if (this.fcproviders_available.length > 0 && this.fcproviders_available.indexOf(currentFcProvider) === -1) {
                    this.setFcProvider(this.fcproviders_available[0]);
                }
            }
            
            // Update places and save state if providers/places changed
            this.updateHPlace(persist !== 'ei');
            this.updateFcPlace(persist !== 'ei');
        
            // Only reload if explicitly requested and DOM is ready
            if (load === 'ja' || load === true) {
                this.reloadAfterPlaceChange();
            }
            
            return false;
        },
        
        // Separate function to handle reload logic after place changes
        reloadAfterPlaceChange: function() {
            this.doReload('both');
        },
        
        // Get forecast station display name for current place and provider
        getFcStationDisplayName: function(curplace) {
            var currentFcProvider = this.getCurrentFcProvider();
            if (!curplace || !currentFcProvider) return '';
            
            // Try to get the specific selected forecast station first using provider struct
            var fcStruct = this.getCurrentFcProviderStruct();
            if (fcStruct && fcStruct.currentStation && fcStruct.currentStation.name) {
                return fcStruct.currentStation.name;
            }
            
            // Fallback to place name
            if (curplace.name) {
                return curplace.name;
            }

            // Fallback to old bind system
            if (curplace.bind && this.fcplaces && this.fcplaces[curplace.bind]) {
                return this.fcplaces[curplace.bind].name;
            }
            
            // Fallback to provider name
            if (this.fcprovidersmeta[currentFcProvider]) {
                return this.fcprovidersmeta[currentFcProvider].name;
            }
            
            return '';
        },
        setPlace: function(d, name, persist) {
            // Simplified function - just saves the place
            // Provider-specific logic should be handled in setCurPlace
            name = name || 'curplace';
            persist = persist !== 'ei';
            
            if (!d) d = this.state.attr[name];
            if (d) {
                this[name] = d;
                if (persist === 'ja') {
                    var j = {};
                    j[name] = d;
                    this.state.set(j);
                }
            }
            return false;
        },
        nextCurPlace: function() {
            return this.nextPlace('curplace');
        },
        nextPlace: function(name) {
            name = name || 'fcplace';
            
            var places, place;
            if (name === 'fcplace') {
                // Use new forecast station structure
                places = this.getAvailableFcStations();
                place = this.getCurrentFcProvider();
                
                // Convert to object format for compatibility
                var placesObj = {};
                places.forEach(function(station) {
                    placesObj[station.id] = station;
                });
                places = placesObj;
            } else {
                places = this[name + 's'] || this.fcplaces;
                // For compatibility, get current place from provider struct
                var fcStruct = this.getCurrentFcProviderStruct();
                place = this[name] || (fcStruct && fcStruct.currentStation ? fcStruct.currentStation.id : '');
            }
            
            var p = '',
                that = false,
                j = '',
                i;
            //console.log(JSON.stringify(places));
            for (i in places) {
                if (!j && (!this.showgroup || (this.showgroup === places[i].group))) j = i;
                if (that) {
                    if (!this.showgroup || (this.showgroup === places[i].group)) {
                        p = i;
                        that = false;
                    }
                }
                if (i === place) that = true;
                //console.log(name + ' "' + i + '" ' + place +  " " + (that?"ready":"") + " " + p + " " + this.showgroup);
            }
            if (!p) p = j;
            //console.log("got place " + name + ' ' + p + ' from ' + place);
            return p;
        },
        doReload: function(reload) {
            if (!w.ilm || !w.ilm.reload) return false;
            if (reload === 'both') {
                w.ilm.reloadest();
                w.ilm.reload();
            } else if (/fc/.test(reload)) w.ilm.reloadest();
            else w.ilm.reload();
            return false;
        },
        setGroup: function(d) {
            if (d === '' || (/^(jarv|meri)$/.test(d) && this.showgroup !== d)) {
                this.showgroup = d;
                this.state.set({ showgroup: (d ? d : 'none') });
                if (!d) return false;
                
                // Check if current forecast provider is in the right group
                var fcStations = this.getAvailableFcStations();
                var currentFcProvider = this.getCurrentFcProvider();
                var currentFcStation = fcStations.find(function(station) {
                    return station.id === currentFcProvider;
                });
                
                if (currentFcStation && currentFcStation.group !== this.showgroup) {
                    // Find next suitable forecast provider
                    var nextFcStation = fcStations.find(function(station) {
                        return station.group === my.showgroup;
                    });
                    if (nextFcStation) {
                        this.setFcProvider(nextFcStation.id);
                    }
                }
                
                if (this.curplaces[this.curplace].group !== this.showgroup) this.setCurPlace(this.nextCurPlace());
                //this.doReload("both");
            }
            return false;
        },
        setOrder: function(input) {
            var o = (Object.prototype.toString.call(input) === '[object String]') ? input.split(/[,:]/) : input,
                p = this.chartorder;
            if (Object.prototype.toString.call(o) !== '[object Array]') return false;
            if (o.join(':') === p.join(':')) return false;
            this.chartorder = o;
            this.state.set({ chartorder: this.chartorder });
            this.reorder();
            return false;
        },
        setBinded: function(value) {
            if (/(0|false)/.test(value)) value = false;
            if (/(1|true)/.test(value)) value = true;
            if (typeof value === 'boolean' && this.binded !== value) {
                this.binded = value;
                this.state.set({ binded: this.binded });
            }
            return false;
        },
        setLinksAsMenu: function(value) {
            if (/(0|false)/.test(value)) value = false;
            if (/(1|true)/.test(value)) value = true;
            if (typeof value === 'boolean' && this.linksasmenu !== value) {
                this.linksasmenu = value;
                this.state.set({ linksasmenu: this.linksasmenu });
            }
            return false;
        },
        setAsTable: function(value) {
            if (/(0|false)/.test(value)) value = 'graph';
            if (/(1|true)/.test(value)) value = 'table';
            if (this.samplemode !== value) {
                this.samplemode = value;
                this.state.set({ samplemode: this.samplemode });
                this.reload();
            }
            return false;
        },
        setFcShowNight: function(value) {
            if (/(0|false)/.test(value)) value = false;
            if (/(1|true)/.test(value)) value = true;
            if (this.fcshownight !== value) {
                this.fcshownight = value;
                this.state.set({ fcshownight: this.fcshownight });
                this.reloadest();
            }
            return false;
        },
        setDate: function(d, load) {
            if(!d) return;
            load = load || 'ja';
            var ret = 0,
                dd = '',
                cur = this.getTime();
            if (d && (/^\d*[-.]\d*[-.]\d*/).test(d)) {
                dd = d.split(/[\sT]/)[0];
                dd = dd.split(/[-.]/, 3);
                if (dd[0] > 2000) {
                    d = dd[0] + '-' + dd[1] + '-' + dd[2];
                } else {
                    d = dd[2] + '-' + dd[1] + '-' + dd[0];
                }
                d += 'T23:59:59';
                ret = this.getTime(d);
            } else if (d && (/^\d+$/).test(d)) {
                ret = this.getTime() - (Number(d) * 1000);
            } else if (d && (/^\d*h/).test(d)) {
                ret = this.getTime() - (Number(d.replace(/h*$/, '')) * 3600 * 1000);
            } else if (d && (/^\d*d/).test(d)) {
                ret = this.getTime() - (Number(d.replace(/d*$/, '')) * 24 * 3600 * 1000);
            }
            if (!d || (ret && ret > cur)) {
                ret = cur;
            }
            if (ret) {
                this.historyactive = (cur - (3600 * 1000) > ret) ? true : false;
                this.start = this.date = ret;
                $('.startdate-control>input').val(this.getDateString(ret));
                if (load === 'ja') this.doReload('curplace');
            }
        },
        isDst: function() {
            var utc = new Date();
            var utcsec = utc.getTime();
            var dls = new Date(utc.getFullYear(), 3, 0);
            var dle = new Date(utc.getFullYear(), 10, 0);
            dls.setDate(dls.getDate() - dls.getDay());
            dle.setDate(dle.getDate() - dle.getDay());
            //console.log("isDst: " + dls.getTime() + "  " + utcsec + "  " + dle.getTime());
            if (utcsec < dle.getTime() && utcsec >= dls.getTime()) return true;
            else return false;
        },
        getOffsetSec: function(offset) {
            if (this.addDst === undefined) this.addDst = this.isDst();
            return ((offset || this.timezone) + (this.addDst ? 1 : 0)) * 3600000;
        },
        getTime: function(d, offset) {
            d = this.getGmtTime(d);
            return new Date(d.getTime() + this.getOffsetSec(offset));
        },
        getGmtTime: function(d) {
            d = d ? new Date(d) : new Date();
            return new Date(d.getTime() + (d.getTimezoneOffset() * 60000));
        },
        getTimeStr: function(d, f, g) {
            d = d ? new Date(d) : this.getTime();
            var month = d.getMonth(), ret = '';
            if (!(/\d/).test(month)) return ret;
            var dsep = '.' + (month < 9 ? '0' : '') + (month + 1);
            if (f) { dsep = '. ' + my.months[month].toLowerCase(); }
            ret = (d.getDate() < 9 ? '0' : '') + d.getDate() + dsep; // + d.getFullYear();
            if (this.getTime().getFullYear() !== d.getFullYear()) {
                ret += ((f) ? ' ' : '.') + d.getFullYear();   
            }
            if (!g) ret += ' ' + (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
            return ret;
        },
        viitedTemplate: function(div) {
            var html = '';
            if (div) {
                if (Object.prototype.toString.call(div) === '[object String]') {
                    div = $(div);
                }
                div.html(html);
            }
            return html;
        },
        settingTemplate: function(div) {
            var html = '',
                z = '';
            if (my.state.attr) {
                z = my.getFrame();
                html += '<div><label for="timeframe">Ajaraam</label> <select class="form-control input-sm" onchange="ilm.setFrame(this.options[this.selectedIndex].value);ilm.reload();return true;" id="timeframe" name="timeframe">' +
                    '<option value="12h"' + (z === '12h' ? ' selected' : '') + '>12 tundi</option><option value="1d"' + (z === '1d' ? ' selected' : '') + '>1 päev</option><option value="2d"' + (z === '2d' ? ' selected' : '') + '>2 päeva</option><option value="3d"' + (z === '3d' ? ' selected' : '') + '>3 päeva</option>' +
                    '</select></div>';
                html += '<div><label for="history">Andmed</label> <select class="form-control input-sm" onchange="ilm.setCurPlace(this.options[this.selectedIndex].value);ilm.settingTemplate(\'#ilm-seaded-dropdown\');return false;" id="history-sel" name="history-sel">';
                html += _.map(my.curplaces, function(a) { if (!my.showgroup || my.curplaces[a.id].group === my.showgroup) { return '<option value="' + a.id + '" ' + (a.id === my.curplace ? ' selected' : '') + '>' + a.name + '</option>'; } }).join('');
                html += '</select></div>';
                html += '<div><label for="forecast">Ennustus</label> <select class="form-control input-sm" onchange="ilm.setFcProvider(this.options[this.selectedIndex].value);ilm.settingTemplate(\'#ilm-seaded-dropdown\');return false;" id="forecast-sel" name="forecast-sel">';
                
                // Use new forecast station structure
                if (my.curplace && my.curplaces[my.curplace] && my.curplaces[my.curplace].fcstations) {
                    var fcStations = my.getAvailableFcStations();
                    var currentFcProvider = my.getCurrentFcProvider();
                    html += _.map(fcStations, function(station) {
                        if (!my.showgroup || !station.group || station.group === my.showgroup) {
                            return '<option value="' + station.id + '" ' + (station.id === currentFcProvider ? ' selected' : '') + '>' + station.name + '</option>';
                        }
                    }).join('');
                } else {
                    // Fallback to legacy fcplaces
                    html += _.map(my.fcplaces, function(a) { 
                        if (!my.showgroup || my.fcplaces[a.id].group === my.showgroup) { 
                            return '<option value="' + a.id + '" ' + (a.id === my.fcplace ? ' selected' : '') + '>' + a.name + '</option>'; 
                        } 
                    }).join('');
                }
                html += '</select></div>';
                html += '<div><label for="groups">Ennustuse ja andmete seos</label> <select class="form-control input-sm" onchange="ilm.setBinded(this.options[this.selectedIndex].value);return false;" id="binding-sel" name="binding-sel">';
                html += _.map({ ei: { id: false, name: 'Ei ole seotud' }, jah: { id: true, name: 'On seotud' } }, function(a) { return '<option value="' + a.id + '" ' + (a.id === my.binded ? ' selected' : '') + '>' + a.name + '</option>'; }).join('');
                html += '</select></div>';
                html += '<div><label for="groups">Paikade grupid</label> <select class="form-control input-sm" onchange="ilm.setGroup(this.options[this.selectedIndex].value);ilm.settingTemplate(\'#ilm-seaded-dropdown\');return false;" id="groups-sel" name="groups-sel">';
                html += _.map({ none: { id: '', name: '--' }, jarv: { id: 'jarv', name: 'Järved' }, meri: { id: 'meri', name: 'Meri' } }, function(a) { return '<option value="' + a.id + '" ' + (a.id === my.showgroup ? ' selected' : '') + '>' + a.name + '</option>'; }).join('');
                html += '</select></div>';
                html += '<div><label for="groups">Paigutus</label><div><div style="padding-bottom:3px;"><ul id="order-sel1" class="order itemlist drag-box">';
                html += _.map(my.chartorder, function(a) { return '<li class="drag-item"name="' + a + '">' + my.graph_name(a) + '</li>'; }).join('');
                html += '</ul></div><div><ul id="order-sel2" class="order itemlist drag-box">';
                html += _.map(my.graphs, function(a) { return (my.chartorder.indexOf(a) < 0) ? '<li class="drag-item" name="' + a + '">' + my.graph_name(a) + '</li>' : ''; }).join('');
                html += '</ul></div><div class="checkbox"><label>Näita viiteid menüüs <input type="checkbox" onclick="ilm.setLinksAsMenu(this.checked);return true;" id="linksasmenu" name="linksasmenu"></label></div>';
                html += '<div class="checkbox"><label>Näita ennustust tabelis <input type="checkbox" onclick="ilm.setAsTable(this.checked);return true;" id="samplemode" name="samplemode"></label></div>';
                html += '<div class="checkbox"><label>Näita öist ennustust <input type="checkbox" onclick="ilm.setFcShowNight(this.checked);return true;" id="fcshownight" name="fcshownight"></label></div>';
                html += '<div class="histdate"><label>Kuupäeva andmed <input class="datepicker" onchange="ilm.setDate(this.value);return true;" id="histdate" name="histdate" value="'+my.getDateString(my.start)+'"></label></div>';
            }
            if (div) {
                if (Object.prototype.toString.call(div) === '[object String]') {
                    div = $(div);
                }
                div.html(html);
                var swp = $('.itemlist');
                if (swp.sortable) {
                    swp.each(function(i, a) { focusEvent(a); });
                    $('.itemlist').sortable({
                        connectWith: '.itemlist',
                        stop: function() {
                            var nl = $('#order-sel1').sortable('toArray', { attribute: 'name' });
                            if (nl.join(':') !== w.ilm.chartorder.join(':')) {
                                //console.log(nl);
                                w.ilm.setOrder(nl);
                            }
                        }
                    });
                }
                if (w.ilm.linksasmenu) $('#linksasmenu').attr({ 'checked': 'checked' });
                if (w.ilm.samplemode === 'table') $('#samplemode').attr({ 'checked': 'checked' });
            }
            return html;
        },
        normalizeData: function(place, hprovider, data, fn, last, start) {
            var b, d, i, j, k, lastdate, prev = null,
                obj = null;
            if (!fn) return 0;
            if (place && place.id) place = place.id;
            if (data && data.data) {
                for (i = last ? data.data.length - 2 : 0, j = data.data.length, k = data.data.length - 1; i < j; ++i) {
                    if (i < 0) continue;
                    b = data.data[i];
                    //$.each(data.data, function (a, b) {
                    prev = obj;
                    obj = my.rowParser(place, b);
                    obj.trend = !prev ? '' : prev.ws_avg > obj.ws_avg ? 'd' : prev.ws_avg < obj.ws_avg ? 'u' : 's';
                    if (!last || k === i) fn(obj, j, i);
                    //});
                }
                if (j) {
                    lastdate = parseInt(data.data[j - 1].time_stamp, 10) * 1000;
                }
            } else if (data) {
                var c, e, g, h = (my.getProviderNum(hprovider) === my.HPROVIDER.UT || /^ut/.test(place)), z = /\d+:\d[012346789]\s/.test(data);
                var reg = new RegExp(h ? '[,\\t]\\s*' : '\\s+?');
                var rtmp = data.split('\n');
                var rows = _.filter(rtmp, function(a) { return a && (/^(\d\d)/).test(a); });
                for (i = last ? rows.length - 2 : 0, j = rows.length, k = rows.length - 1; i < j; ++i) {
                    if (i < 0) continue;
                    b = rows[i];
                    //$.each(rows,function(a, b) {
                    if (b && !(/^(--|Aeg)/).test(b)) {
                        c = b.split(reg);
                        c[9] = (!c[9] || c[9] < 0) ? 0 : c[9];
                        if (!last && ((h && (/5:00$/).test(c[0])) || (!h && z && (/5$/).test(c[1])))) {
                            e = c;
                        } else {
                            if (h) lastdate = d = new Date(c[0].replace(/(\d\d\d\d)-?(\d\d)-?(\d\d)/, '$1/$2/$3')).getTime();
                            else lastdate = d = new Date(c[0].replace(/(\d\d\d\d)(\d\d)(\d\d)/, '$1/$2/$3') + ' ' + c[1]).getTime();
                            g = start - lastdate;
                            if (!start || (my.timeframe && g > 0 && g <= my.timeframe)) {
                                prev = obj;
                                obj = my.rowParser(place, c, d, e);
                                obj.trend = !prev ? '' : prev.avg_ws > obj.avg_ws ? 'd' : prev.avg_ws < obj.avg_ws ? 'u' : prev.max_ws > obj.max_ws ? 'd' : prev.max_ws < obj.max_ws ? 'u' : 's';
                                if (!last || k === i) fn(obj, j, i);
                            }
                        }
                    }
                    //});
                }
            }
            return lastdate;
        },
        rowToSeries: function(o, obj) {
            if (!o) return;
            for (var p in o) {
                if (p !== 'time' && obj[p + '_series'] && obj[p + '_series'].data) {
                    obj[p + '_series'].data.push([o.time, o[p]]);
                }
            }
        },
        nightPlots: function(times, loc) {
            if (!times) return null;
            var plots = [];
            var x = 0;
            var night = [];
            var d, c;
            while (x >= 0) {
                c = new Date(x > 0 ? x : times[0]);
                d = SunCalc.getTimes(c, loc[0], loc[1]) || {};
                if (x === 0) {
                    x = times[0];
                    if (x < d.sunrise.getTime()) {
                        night[0] = x;
                        night[1] = d.sunrise.getTime();
                        plots.push({ color: '#eee', from: night[0], to: night[1], zIndex: 0 });
                        //night=[];
                    }
                } else {
                    night[1] = d.sunrise.getTime();
                    if (night[1] > times[1]) night[1] = times[1];
                    if (night[0] && night[1] && night[1] > night[0]) plots.push({ color: '#eee', from: night[0], to: night[1] });
                    //night=[];
                }
                night[0] = d.sunset.getTime();
                x += (24 * 3600 * 1000);
                if (x > times[1] && night[1] === times[1]) x = -1;
            }
            return plots;
        },

        rowParser: function(place, c, d, e) {
            var r = {},
                my = this;
            if (!c) return r;
            if (c.time_stamp) {
                r.time = parseInt(c.time_stamp, 10) * 1000;
                r.avg_ws = my.ntof2p(c.avg_wind_speed);
                r.max_ws = my.ntof2p(c.max_wind_speed);
                r.avg_wd = my.ntof2p(c.avg_wind_direction);
                r.max_wd = my.ntof2p(c.max_wind_direction);
                r.avg_temp = my.ntof2p(c.avg_outdoor_temperature);
                r.avg_dp = my.ntof2p(c.avg_dewpoint);
                r.avg_wc = my.ntof2p(c.avg_windchill);
                r.avg_rain = my.ntof2p(c.rain_1hour);
                r.avg_humid = my.ntof2p(c.outdoor_humidity);
                r.avg_press = my.ntof2p(c.avg_absolute_pressure);
            } else {
                const pdata = my.state.attr.viewStates[place];
                const hprovider = pdata ? pdata.hprovider : 
                    /ut_/.test(place) ? 'ut' : 
                        /emhi_/.test(place) ? 'emhi' : 
                            /ttu_/.test(place) ? 'ttu' : 
                                /mnt_/.test(place) ? 'mnt' : 
                                    /wsds_/.test(place) ? 'wsds' : '';
                    
                // Fast numeric provider lookup
                const providerNum = my.getProviderNum(hprovider);
                
                for (var i = 0, j = c.length; i < j; ++i) {
                    c[i] = c[i] || null;
                    if (e) { e[i] = e[i] || null; }
                }
                r.time = d || new Date(c[0].replace(/(\d\d\d\d)(\d\d)(\d\d)/, '$1/$2/$3') + ' ' + c[1]).getTime();
                
                // Use fast numeric comparisons instead of string comparisons
                if (providerNum === my.HPROVIDER.UT) {
                    r.time = d || new Date(c[0].replace(/(\d\d\d\d)-?(\d\d)-?(\d\d)/, '$1/$2/$3')).getTime();
                    c[1] = (c[1] && (c[1] < -49 || c[1] > 49)) ? null : c[1];
                    c[4] = (c[4] && (c[4] < 0 || c[4] > 49)) ? null : c[4];
                    r.avg_ws = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
                    //r["max_ws"] = my.ntof2p((e) ? my.getmax([c[8], e[8]]) : c[8]);
                    r.avg_wd = my.ntof2p((e) ? my.wdavg([c[5], e[5]]) : c[5]);
                    if (c[1] !== null) r.avg_temp = my.ntof2p((e) ? my.getavg([c[1], e[1]]) : c[1]);
                    r.avg_rain = my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6]);
                    r.avg_humid = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
                    r.avg_press = my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3]);
                } else if (providerNum === my.HPROVIDER.EMU) {
                    r.avg_ws = my.conv_kmh2ms(my.ntof2p((e) ? my.getavg([c[7], e[7]]) : c[7]));
                    r.max_ws = my.conv_kmh2ms(my.ntof2p((e) ? my.getmax([c[8], e[8]]) : c[8]));
                    r.avg_wd = my.ntof2p((e) ? my.wdavg([c[9], e[9]]) : c[9]);
                    r.avg_temp = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
                    r.avg_dp = my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6]);
                    r.avg_wc = my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3]);
                    r.avg_rain = my.ntof2p((e) ? my.getavg([c[10], e[10]]) : c[10]);
                    r.avg_humid = my.ntof2p((e) ? my.getavg([c[5], e[5]]) : c[5]);
                    r.avg_press = my.ntof2p((e) ? my.getavg([c[11], e[11]]) : c[11]);
                } 
                else if(my.useNewHistPlaces) {
                    // waterlevel bk77 pos 2
                    r.avg_wl = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
                    if(r.avg_wl === null) {
                        // or waterlevel eh2000 pos 3
                        r.avg_wl = my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3]);
                        if(r.avg_wl !== null) r.avg_wl -= 23; // convert eh2000 to bk77
                    }
                    r.avg_wtemp = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
                    if (c[5] !== null) r.avg_temp = my.ntof2p((e) ? my.getavg([c[5], e[5]]) : c[5]);
                    r.avg_ws = my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6]);
                    r.max_ws = my.ntof2p((e) ? my.getmax([c[7], e[7]]) : c[7]);
                    r.avg_wd = my.ntof2p((e) ? my.wdavg([c[8], e[8]]) : c[8]);
                    r.avg_rain = my.ntof2p((e) ? my.getavg([c[9], e[9]]) : c[9]);
                    r.avg_humid = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
                    r.avg_press = my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3]);
                }
                else if (providerNum === my.HPROVIDER.EMHI) {
                    /*
<tr>
<th>Aeg</th>
<th>Veetase (BK77, cm)</th>
<th>Veetase (EH2000, cm)</th>
<th>Veetemperatuur (°C)</th>
<th>Õhutemperatuur (°C)</th>
<th>Tuule kiirus 2 minuti keskmine (m/s)</th>
<th>Tuule suund 2 minuti keskmine (°)</th>
<th>Tuule kiirus 10 minuti keskmine (m/s)</th>
<th>Tuule kiirus 10 minuti maksimum (m/s)</th>
<th>Tuule suund 10 minuti keskmine (°)</th>
</tr>
<tr>
date 0
time 1 <td class="number">14:00</td>
wl1 2 <td class="number">-13</td>
wl2 3 <td class="number">4</td>
wtemp 4 <td class="number">9,3</td>
temp 5 <td class="number">9,8</td>
2ws 6 <td class="number">9,2</td>
2wd 7 <td class="number">224</td>
10avgws 8 <td class="number">9,3</td>
10maxws 9 <td class="number">11,6</td>
10wd 10 <td class="number">225</td>
</tr>
*/
                    c[5] = (c[5] === null || c[5] === undefined || c[5] < -49) ? null : c[5];
                    c[8] = (c[8] && (c[8] < 0 || c[8] > 49)) ? null : c[8];
                    if (e) e[8] = (e[8] && (e[8] < 0 || e[8] > 49)) ? null : e[8];
                    c[9] = (c[9] && (c[9] < 0 || c[9] > 49)) ? null : c[9];
                    if (e) e[9] = (e[9] && (e[9] < 0 || e[9] > 49)) ? null : e[9];
                    r.avg_ws = my.ntof2p((e) ? my.getavg([c[8], e[8]]) : c[8]);
                    r.max_ws = my.ntof2p((e) ? my.getmax([c[9], e[9]]) : c[9]);
                    r.avg_wd = my.ntof2p((e) ? my.wdavg([c[10], e[10]]) : c[10]);
                    if (c[5] !== null) r.avg_temp = my.ntof2p((e) ? my.getavg([c[5], e[5]]) : c[5]);
                    r.avg_wtemp = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
                    r.avg_wl = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
                } else if (providerNum === my.HPROVIDER.TTU) {
                    c[5] = (c[5] === null || c[5] === undefined || c[5] < -49) ? null : c[5];
                    c[6] = (c[6] && (c[6] < 0 || c[6] > 49)) ? null : c[6];
                    if (e) e[6] = (e[6] && (e[6] < 0 || e[6] > 49)) ? null : e[6];
                    c[7] = (c[7] && (c[7] < 0 || c[7] > 49)) ? null : c[7];
                    if (e) e[7] = (e[7] && (e[7] < 0 || e[7] > 49)) ? null : e[7];
                    r.avg_ws = my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6]);
                    r.max_ws = my.ntof2p((e) ? my.getmax([c[7], e[7]]) : c[7]);
                    r.avg_wd = my.ntof2p((e) ? my.wdavg([c[8], e[8]]) : c[8]);
                    if (c[5] !== null) r.avg_temp = my.ntof2p((e) ? my.getavg([c[5], e[5]]) : c[5]);
                    r.avg_wtemp = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
                    r.avg_wl = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
                    if (c[9] !== '') r.avg_humid = my.ntof2p((e) ? my.getavg([c[9], e[9]]) : c[9]);
                    if (c[10] !== '') r.avg_press = my.ntof2p((e) ? my.getavg([c[10], e[10]]) : c[10]);
                    if (c[11] !== '') r.avg_rain = my.ntof2p((e) ? my.getavg([c[11], e[11]]) : c[11]);
                } else if (providerNum === my.HPROVIDER.MNT) {
                    c[2] = (c[2] === null || c[2] === undefined || c[2] < -49) ? null : c[2];
                    c[8] = (c[8] && (c[8] < 0 || c[8] > 49)) ? null : c[8];
                    if (e) e[8] = (e[8] && (e[8] < 0 || e[8] > 49)) ? null : e[8];
                    c[6] = (c[6] && (c[6] < 0 || c[6] > 49)) ? null : c[6];
                    if (e) e[6] = (e[6] && (e[6] < 0 || e[6] > 49)) ? null : e[6];
                    r.avg_ws = my.ntof2p((e) ? my.getavg([c[8], e[8]]) : c[8]);
                    r.max_ws = my.ntof2p((e) ? my.getmax([c[6], e[6]]) : c[6]);
                    r.avg_wd = my.ntof2p((e) ? my.wdavg([c[7], e[7]]) : c[7]);
                    if (c[2] !== '') r.avg_temp = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
                    if (c[3] !== '') r.avg_rain = my.ntof2p((e) ? my.getavg([c[3], e[3]]) : c[3]);
                    if (c[4] !== '') r.avg_humid = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
                    if (c[5] !== '') r.avg_dp = my.ntof2p((e) ? my.getavg([c[5], e[5]]) : c[5]);
                } else if (providerNum === my.HPROVIDER.WSDS) {
                    r.avg_ws = my.ntof2p((e) ? my.getavg([c[6], e[6]]) : c[6]);
                    r.max_ws = my.ntof2p((e) ? my.getmax([c[7], e[7]]) : c[7]);
                    r.avg_wd = my.ntof2p((e) ? my.wdavg([c[5], e[5]]) : c[5]);
                    if (c[2] !== '') r.avg_temp = my.ntof2p((e) ? my.getavg([c[2], e[2]]) : c[2]);
                    if (c[4] !== '') r.avg_dp = my.ntof2p((e) ? my.getavg([c[4], e[4]]) : c[4]);
                    if (c[8] !== '') r.avg_humid = my.ntof2p((e) ? my.getavg([c[8], e[8]]) : c[8]);
                    if (c[9] !== '') r.avg_press = my.ntof2p((e) ? my.getavg([c[9], e[9]]) : c[9]);
                }
            }
            return r;
        },
    };

    function touchHandler(event) {
        var touch = event.changedTouches[0];
        var simulatedEvent = document.createEvent('MouseEvent');
        simulatedEvent.initMouseEvent({
            touchstart: 'mousedown',
            touchmove: 'mousemove',
            touchend: 'mouseup'
        }[event.type], true, true, window, 1,
        touch.screenX, touch.screenY,
        touch.clientX, touch.clientY, false,
        false, false, false, 0, null);
        touch.target.dispatchEvent(simulatedEvent);
        event.preventDefault();
    }

    function focusEvent(div) {
        div.addEventListener('touchstart', touchHandler, true);
        div.addEventListener('touchmove', touchHandler, true);
        div.addEventListener('touchend', touchHandler, true);
        div.addEventListener('touchcancel', touchHandler, true);
    }

    function unFocusEvent(div) {
        div.removeEventListener('touchstart', touchHandler, true);
        div.removeEventListener('touchmove', touchHandler, true);
        div.removeEventListener('touchend', touchHandler, true);
        div.removeEventListener('touchcancel', touchHandler, true);
    }

    var googleMapStyles1 = [{
        'elementType': 'geometry',
        'stylers': [{
            'color': '#f5f5f5'
        }]
    },
    {
        'elementType': 'labels.icon',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'elementType': 'labels.text.fill',
        'stylers': [{
            'color': '#616161'
        }]
    },
    {
        'elementType': 'labels.text.stroke',
        'stylers': [{
            'color': '#f5f5f5'
        }]
    },
    {
        'featureType': 'administrative.country',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'administrative.land_parcel',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'administrative.land_parcel',
        'elementType': 'labels',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'administrative.land_parcel',
        'elementType': 'labels.text.fill',
        'stylers': [{
            'color': '#bdbdbd'
        }]
    },
    {
        'featureType': 'administrative.neighborhood',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'administrative.province',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'landscape.man_made',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'landscape.natural.landcover',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'landscape.natural.terrain',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'poi',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#eeeeee'
        }]
    },
    {
        'featureType': 'poi',
        'elementType': 'labels.text',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'poi',
        'elementType': 'labels.text.fill',
        'stylers': [{
            'color': '#757575'
        }]
    },
    {
        'featureType': 'poi.attraction',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'poi.business',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'poi.government',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'poi.medical',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'poi.park',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#e5e5e5'
        }]
    },
    {
        'featureType': 'poi.park',
        'elementType': 'labels.text',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'poi.park',
        'elementType': 'labels.text.fill',
        'stylers': [{
            'color': '#9e9e9e'
        }]
    },
    {
        'featureType': 'poi.place_of_worship',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'poi.school',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'poi.sports_complex',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'road',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#ffffff'
        }]
    },
    {
        'featureType': 'road.arterial',
        'elementType': 'labels',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'road.arterial',
        'elementType': 'labels.text.fill',
        'stylers': [{
            'color': '#757575'
        }]
    },
    {
        'featureType': 'road.highway',
        'stylers': [{
            'visibility': 'simplified'
        }]
    },
    {
        'featureType': 'road.highway',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#dadada'
        }]
    },
    {
        'featureType': 'road.highway',
        'elementType': 'labels',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'road.highway',
        'elementType': 'labels.text.fill',
        'stylers': [{
            'color': '#616161'
        }]
    },
    {
        'featureType': 'road.highway.controlled_access',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'road.local',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'road.local',
        'elementType': 'labels',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'road.local',
        'elementType': 'labels.text.fill',
        'stylers': [{
            'color': '#9e9e9e'
        }]
    },
    {
        'featureType': 'transit.line',
        'stylers': [{
            'visibility': 'simplified'
        }]
    },
    {
        'featureType': 'transit.line',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#e5e5e5'
        }]
    },
    {
        'featureType': 'transit.line',
        'elementType': 'labels.text.fill',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'transit.station',
        'stylers': [{
            'visibility': 'off'
        }]
    },
    {
        'featureType': 'transit.station',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#eeeeee'
        }]
    },
    {
        'featureType': 'water',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#c9c9c9'
        }]
    },
    {
        'featureType': 'water',
        'elementType': 'labels.text.fill',
        'stylers': [{
            'color': '#9e9e9e'
        }]
    }
    ];

    if(!my.state) {
        my = new App();
        w.ilm = my;
    }

    // Provider enum for fast numeric comparisons - accessible from all modules
    my.HPROVIDER = {
        UNKNOWN: 0,
        UT: 1,
        EMU: 2,
        EMHI: 3,
        TTU: 4,
        MNT: 5,
        WSDS: 6
    };
    
    // Fast provider lookup - accessible from all modules
    my.getProviderNum = function(hprovider) {
        switch (hprovider) {
        case 'ut': return my.HPROVIDER.UT;
        case 'emu': return my.HPROVIDER.EMU;
        case 'emhi': return my.HPROVIDER.EMHI;
        case 'ttu': return my.HPROVIDER.TTU;
        case 'mnt': return my.HPROVIDER.MNT;
        case 'wsds': return my.HPROVIDER.WSDS;
        default: return my.HPROVIDER.UNKNOWN;
        }
    };
    
    //my.setDate("2014-04-25T00:00:00");
    //my.setFrame('3d');
    //console.log(my.getTimeStr(my.date) + " " + my.timeframe);
    return my;
})(window.ilm || {});

(function() {
    var w = window,
        $ = w.$;
    var WindBarbArrowHandler = {
        WindArrow: function(speed, direction, container, arrowWidth) {
            'use strict';
            var index = 0,
                i;

            this.speed = speed;
            this.direction = direction;
            this.trigDirection = direction + 90;
            this.scale = arrowWidth / 8;

            this.ten = 0;
            this.five = 0;
            this.fifty = 0;


            // Create the canvas
            $(container).append(
                $(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
                    .attr({
                        height: 2 * arrowWidth,
                        width: 2 * arrowWidth
                    })
            );
            $('svg', container).append(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
            $('defs', container).append($(document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')).attr('id', 'clip'));
            $('clipPath', container).append($(document.createElementNS('http://www.w3.org/2000/svg', 'rect'))
                .attr({
                    height: 2 * arrowWidth,
                    width: 2 * arrowWidth
                }));

            // Draw the widget area
            $('svg', container).append($(document.createElementNS('http://www.w3.org/2000/svg', 'g')).attr('class', 'wind-arrow'));

            this.widget = $('svg', container);

            if (this.speed > 0) {
                // Prepare the path
                this.path = '';
                if (this.speed <= 7) {
                    // Draw a single line
                    this.longBar();
                    index = 1;
                } else {
                    this.shortBar();
                }

                // Find the number of lines in function of the speed
                this.five = Math.floor(this.speed / 5);
                if (this.speed % 5 >= 3) {
                    this.five += 1;
                }

                // Add triangles (5 * 10)
                this.fifty = Math.floor(this.five / 10);
                this.five -= this.fifty * 10;
                // Add tenLines (5 * 2)
                this.ten = Math.floor(this.five / 2);
                this.five -= this.ten * 2;

                // Draw first the triangles
                for (i = 0; i < this.fifty; i++) {
                    this.addFifty(index + 2 * i);
                }
                if (this.fifty > 0) {
                    index += 2 * (this.fifty - 0.5);
                }

                // Draw the long segments
                for (i = 0; i < this.ten; i++) {
                    this.addTen(index + i);
                }
                index += this.ten;

                // Draw the short segments
                for (i = 0; i < this.five; i++) {
                    this.addFive(index + i);
                }

                this.path += 'Z';

                // Add to the widget

                this.widget.append(document.createElementNS('http://www.w3.org/2000/svg', 'g'));

                $('g', this.widget).append($(document.createElementNS('http://www.w3.org/2000/svg', 'path')).attr({
                    'd': this.path,
                    'vector-effect': 'non-scaling-stroke',
                    'transform': 'translate(' + arrowWidth + ', ' + arrowWidth + ') scale(' + this.scale + ') rotate(' + this.trigDirection + ' ' + 0 + ' ' + 0 + ')  translate(-8, -2)',
                    'class': 'wind-arrow'
                }));
            }

        },

        shortBar: function() {
            // Draw an horizontal short bar.
            'use strict';
            this.path += 'M1 2 L8 2 ';
        },

        longBar: function() {
            // Draw an horizontal long bar.
            'use strict';
            this.path += 'M0 2 L8 2 ';
        },
        addTen: function(index) {
            // Draw an oblique long segment corresponding to 10 kn.
            'use strict';
            this.path += 'M' + index + ' 0 L' + (index + 1) + ' 2 ';
        },
        addFive: function(index) {
            // Draw an oblique short segment corresponding to 10 kn.
            'use strict';
            this.path += 'M' + (index + 0.5) + ' 1 L' + (index + 1) + ' 2 ';
        },
        addFifty: function(index) {
            // Draw a triangle corresponding to 50 kn.
            'use strict';
            this.path += 'M' + index + ' 0 L' + (index + 1) + ' 2 L' + index + ' 2 L' + index + ' 0 ';
        },

    };
    window.WindBarbArrowHandler = window.WindBarbArrowHandler || WindBarbArrowHandler;
    //WindBarbArrowHandler.WindArrow(30, 45, $("#windBarbArrow"), 40);
})();
