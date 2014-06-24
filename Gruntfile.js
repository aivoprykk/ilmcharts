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

    // Task configuration.
    clean: {
      dist: ['js/<%= pkg.name %>.js', 'js/<%= pkg.name %>.min.js', 'css/<%= pkg.name %>.min.css']
    },
    concat: {
      src: {
		options: {
			banner: '<%= banner %>\n<%= jqueryCheck %>',
			stripBanners: false,
			separator: ';'
		},
		src: [
			'js/core.js',
			'js/history.js',
			'js/forecast.js',
			'js/links.js',
			'js/docfix.js'
		],
		dest: 'js/<%= pkg.name %>.js'
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
			'js/highcharts/js/highcharts.js',
			'node_modules/underscore/underscore.js',
			'node_modules/backbone/backbone.js',
			'node_modules/jquery-ui/core.js',
			'node_modules/jquery-ui/datepicker.js',
			'node_modules/bootstrap/dist/js/bootstrap.js'
		],
		dest: 'js/libs.js'
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
        src: '<%= concat.src.dest %>',
        dest: 'js/<%= pkg.name %>.min.js'
      },
      libs: {
      options: {
        preserveComments: false
      },
        src: '<%= concat.libs.dest %>',
        dest: 'js/libs.min.js'
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
		  src: '<%= concat.src.src %>'
      }
    },
    jscs: {
      grunt: {
      	options: {
           "standard": "Idiomatic"
        },
        files: {
      		src: [ 'Gruntfile.js' ]
        }
      },
      src: {
      	options: {
      		"standard": "Jquery"
        },
      	files: {
      		src: '<%= concat.src.src %>'
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
			'css/ilm.css'
		  ]
      }
    },
    cssmin: {
		src: {
			files: {
				'css/<%= pkg.name %>.min.css': [ 
					'node_modules/bootstrap/dist/css/bootstrap.css',
					'node_modules/jquery-ui/themes/base/jquery.ui.core.css',
					'node_modules/jquery-ui/themes/base/jquery.ui.theme.css',
					'node_modules/jquery-ui/themes/base/jquery.ui.datepicker.css',
					'css/ilm.css'
				]
			}
		}
    },
    csscomb: {
      dist: {
        files: {
          'css/<%= pkg.name %>.min.css': 'css/<%= pkg.name %>.min.css'
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
            'css/<%= pkg.name %>.min.css',
          ]
        }
      }
    },

    copy: {
      fonts: {
        expand: true,
        src: 'fonts/*',
        dest: 'dist/'
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
      js: {
        files: '<%= concat.src.src %>',
        tasks: ['jshint:src', 'concat:src', 'uglify:src'],
        options: {
          livereload: true,
        }
      },
      css: {
        files: [ '<%= csslint.src.src %>', ],
        tasks: ['csslint:src', 'cssmin:src'],
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
  grunt.registerTask('dist-js', ['concat', 'uglify']);

  // CSS distribution task.
  grunt.registerTask('dist-css', ['cssmin', 'usebanner']);

  grunt.registerTask('test-js', ['jshint', 'jscs:src']);
  grunt.registerTask('test-css', ['csslint:src']);
  grunt.registerTask('test', ['test-js', 'test-css']);

  // Full distribution task.
  grunt.registerTask('dist', ['clean', 'dist-css', 'dist-js']);

  // Default task.
  grunt.registerTask('default', ['dist']);

  // Version numbering task.
  // grunt change-version-number --oldver=A.B.C --newver=X.Y.Z
  // This can be overzealous, so its changes should always be manually reviewed!
  grunt.registerTask('change-version-number', 'sed');
};
