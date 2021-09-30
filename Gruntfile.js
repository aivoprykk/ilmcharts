/*!
 * Ilm Gruntfile
 */

module.exports = function (grunt) {
    'use strict';

    // Force use of Unix newlines
    grunt.util.linefeed = '\n';

    RegExp.quote = function (string) {
        return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    var fs = require('fs');
    var path = require('path');

    // Project configuration.
    grunt.initConfig({
    // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*!\n' +
    ' * Ilmcharts v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
    ' * Copyright 2012-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
    ' * Licensed under <%= pkg.license.type %> (<%= pkg.license.url %>)\n' +
    ' */\n',
        jqueryCheck: 'if (typeof jQuery === \'undefined\') { throw new Error(\'Ilmcharts\\\'s JavaScript requires jQuery\') }\n\n',
        publicDir: '/public',
        publicJs: '<%=publicDir%>/js',
        publicCss: '<%=publicDir%>/css',
        srcDir: '/src',
        srcJs: '<%=srcDir%>/js',
        srcCss: '<%=srcDir%>/css',
        srcHtml: '<%=srcDir%>/html',
        srcJade: '<%=srcDir%>/jade',
        contribDir: '/contrib',
        // Task configuration.
        clean: {
            dist: [
                'public/js/*.js',
                'public/css/*.css'
            ]
        },
        concat: {
    	html: {
                src: 'src/html/index.html',
                dest: 'public/index.html'
            },
            css: {
                options: {
                    stripBanners: false,
                    process: function(src, filepath) {
                        return (/ilm.css/.test(filepath) ?  grunt.template.process('<%= banner %>\n') : '') + src;
                    }
                },
                src: [
                    'node_modules/bootstrap/dist/css/bootstrap.css',
                    'node_modules/bootstrap/dist/css/bootstrap-theme.css',
                    'node_modules/jquery-ui/themes/base/jquery.ui.core.css',
                    'node_modules/jquery-ui/themes/base/jquery.ui.theme.css',
                    'node_modules/jquery-ui/themes/base/jquery.ui.datepicker.css',
                    'src/css/ilm.css'
                ],
                dest: 'public/css/<%= pkg.name %>.css'
            },
            js: {
                options: {
                    banner: '<%= banner %>\n<%= jqueryCheck %>',
                    stripBanners: false,
                    separator: ';'
                },
                src: [
                    'src/js/core.js',
                    'src/js/history.js',
                    'src/js/forecast.js',
                    'src/js/links.js',
                    'src/js/docfix.js'
                ],
                dest: 'public/js/<%= pkg.name %>.js'
            },
            libs: {
                options: {
                    stripBanners: false,
                    process: function(src, filepath) {
                        return src.replace(/(\n|^)(var[^=]+=\s)?require\([^\)]+\);/g, '');
                    }
                },
                src: [
                    'node_modules/jquery/dist/jquery.js',
                    //'node_modules/highcharts/highcharts.src.js',
                    'contrib/highcharts/js/highcharts.src.js',
                    'node_modules/underscore/underscore.js',
                    'node_modules/jquery-ui/core.js',
                    'node_modules/jquery-ui/datepicker.js',
                    'node_modules/jquery-ui/widget.js',
                    'node_modules/jquery-ui/mouse.js',
                    'node_modules/jquery-ui/sortable.js',
                    'node_modules/bootstrap/dist/js/bootstrap.js',
                    'node_modules/suncalc/suncalc.js'
                ],
                dest: 'public/js/libs.js'
            }
        },
        uglify: {
            options: {
                report: 'min',
                mangle: false
            },
            src: {
                options: {
                    banner: '<%= banner %>'
                },
                src: '<%= concat.js.dest %>',
                dest: 'public/js/<%= pkg.name %>.min.js'
            },
            libs: {
                options: {
                    preserveComments: false
                },
                src: '<%= concat.libs.dest %>',
                dest: 'public/js/libs.min.js'
            }
        },
        jshint: {
            gruntfile: {
                src: ['Gruntfile.js']
            },
            src: {
                options: {
                    curly: false,
                    eqeqeq: true,
                    eqnull: true,
                    browser: true,
                    globals: {
                        jQuery: true
                    },
                },
                src: '<%= concat.js.src %>'
            }
        },
        jscs: {
            grunt: {
                options: {
                    'standard': 'Idiomatic'
                },
                files: {
                    src: [ 'Gruntfile.js' ]
                }
            },
            src: {
                options: {
                },
                files: {
                    src: '<%= concat.js.src %>'
                }
            },
            debug: {
                options: {
                    'standard': 'Jquery',
                    'report' : 'checkstyle',
                    'report-file' : 'public/jscs-report.html'
                },
                files: {
                    src: '<%= concat.js.src %>'
                }
            }
        },
        csslint: {
            libs: {
                src: [
                    'node_modules/bootstrap/dist/css/bootstrap.css',
                    'node_modules/jquery-ui/themes/base/jquery.ui.core.css',
                    'node_modules/jquery-ui/themes/base/jquery.ui.theme.css',
                    'node_modules/jquery-ui/themes/base/jquery.ui.datepicker.css',
                ]
            },
            src: {
                src: [
                    'src/css/ilm.css'
                ]
            }
        },
        cssmin: {
            src: {
                files: {
                    'public/css/<%= pkg.name %>.min.css': 'public/css/<%= pkg.name %>.css'
                }
            }
        },
        csscomb: {
            dist: {
                files: {
                    'public/css/<%= pkg.name %>.css': 'public/css/<%= pkg.name %>.css'
                }
            }
        },
        usebanner: {
            dist: {
                options: {
                    position: 'top',
                    banner: '<%= banner %>'
                },
                files: {
                    src: [
                        'src/css/ilm.css',
                    ]
                }
            }
        },

        copy: {
            'bootstrap-fonts': {
                expand: true,
                flatten: true,
                src: 'node_modules/bootstrap/fonts/*',
                dest: 'public/fonts',
                filter: 'isFile'
            },
            'jquery-ui': {
                expand: true,
                flatten: true,
                src: 'node_modules/jquery-ui/themes/base/images/*',
                dest: 'public/css/images',
                filter: 'isFile'
            },
            app: {
                expand: true,
                flatten: true,
                src: 'src/css/images/*',
                dest: 'public/css/images',
                filter: 'isFile'
            }
        },
        pugOpt: {
            title: 'Ilmajaam',
            name: '<%= pkg.name %>',
            lang: '<%= pkg.language %>',
            charset: '<%= pkg.charset %>',
            desc: '<%= pkg.description %>',
            giturl: '<%= pkg.repository.url %>',
            css: 'css/<%= pkg.name %>',
            js: 'js/<%= pkg.name %>',
            contrib: 'js/libs',
            version: '<%= pkg.version %>'
        },
        pug: {
            dist: {
                options: {
                    data: {
                        opt: '<%= pugOpt %>',
                        dev: false
                    },
                    pretty: false,
                    filters: {
                        min: function(block){return block.replace(/\r?\n/g,'');}
                    }
                },
                files: {
                    'public/index.html': 'src/pug/index.pug',
                    'public/index2.html': 'src/pug/index2.pug'
                }
            },
            dev: {
                options: {
                    data: {
                        opt: '<%= pugOpt %>',
                        dev:true
                    },
                    pretty: true
                },
                files: {
                    'public/index.debug.html': 'src/pug/index.pug',
                    'public/index.debug2.html': 'src/pug/index2.pug'
                }
            },
        },
        validation: {
            options: {
                charset: 'utf-8',
                doctype: 'HTML5',
                failHard: true,
                reset: true,
                relaxerror: [
                    'Bad value X-UA-Compatible for attribute http-equiv on element meta.',
                    'Element img is missing required attribute src.'
                ]
            },
            src: {
                files: {
                    src: 'src/**/*.html'
                }
            },
            pub: {
                files: {
                    src: 'public/*.html'
                }
            }
        },
        watch: {
            gruntfile: {
                files: 'Gruntfile.js',
                tasks: ['jshint:gruntfile'],
                options: {
                    livereload: true,
                }
            },
            pug: {
                files: 'src/**/*.pug',
                tasks: ['pug','validation:pub'],
                options: {
                    livereload: true,
                }
            },
            html: {
                files: 'src/**/*.html',
                tasks: ['validation:src','concat:html'],
                options: {
                    livereload: true,
                }
            },
            js: {
                files: '<%= concat.js.src %>',
                tasks: ['jshint:src', 'concat:js', 'uglify:src'],
                options: {
                    livereload: true,
                }
            },
            css: {
                files: [ '<%= csslint.src.src %>', ],
                tasks: ['csslint:src', 'concat:css', 'cssmin:src'],
                options: {
                    livereload: true,
                }
            }
        },
        sed: {
            versionNumber: {
                pattern: (function () {
                    var old = grunt.option('oldver');
                    return old ? RegExp.quote(old) : old;
                })(),
                replacement: grunt.option('newver'),
                recursive: true
            }
        },
        index: {
            src: 'src/html/index.html',
            dest: 'public/index.html'
        },
        exec: {
            npmUpdate: {
                command: 'npm update'
            },
            npmShrinkWrap: {
                command: 'npm shrinkwrap --dev'
            }
        }
    });

    require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});

    // JS distribution task.
    grunt.registerTask('dist-js', ['concat:js','concat:libs', 'uglify']);

    // CSS distribution task.
    grunt.registerTask('dist-css', ['concat:css', 'cssmin', 'copy']);

    // HTML distribution task.
    grunt.registerTask('dist-html', ['concat:html']);
    grunt.registerTask('dist-pug', ['pug:dist']);
    grunt.registerTask('dev-pug', ['pug:dev']);


    grunt.registerTask('test-js', ['jshint', 'jscs:src']);
    grunt.registerTask('test-js-debug', ['jshint', 'jscs:debug']);
    grunt.registerTask('test-css', ['csslint:src']);
    grunt.registerTask('test-html', ['validation:src']);
    grunt.registerTask('test-pug', ['validation:pub']);

    grunt.registerTask('test', ['test-js', 'test-css', 'test-html','test-pug']);

    // Full distribution task.
    grunt.registerTask('dist', ['clean', 'dist-css', 'dist-js', 'pug']);
    // Default task.
    grunt.registerTask('default', ['dist']);

    // Version numbering task.
    // grunt change-version-number --oldver=A.B.C --newver=X.Y.Z
    // This can be overzealous, so its changes should always be manually reviewed!
    grunt.registerTask('change-version-number', 'sed');
};
