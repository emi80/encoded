'use strict';
module.exports = function(grunt) {
    var path = require('path');

    function compressPath(p) {
        var src = 'src/encoded/static/';
        p = path.relative(__dirname, p);
        if (p.slice(0, src.length) == src) {
            return '../' + p.slice(src.length);
        }
        return '../../' + p;
    }

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            brace: {
                dest: './src/encoded/static/build/brace.js',
                require: [
                    'brace',
                    'brace/mode/json',
                    'brace/theme/solarized_light',
                ],
                options: {
                    debug: true,
                },
                plugin: [
                    ['minifyify', {
                        map: 'brace.js.map',
                        output: './src/encoded/static/build/brace.js.map',
                        compressPath: compressPath,
                        uglify: {mangle: process.env.NODE_ENV == 'production'},
                    }],
                ],
            },
            inline: {
                dest: './src/encoded/static/build/inline.js',
                src: [
                    './src/encoded/static/inline.js',
                ],
                options: {
                    debug: true,
                },
                require: [
                    'scriptjs',
                    'google-analytics',
                ],
                transform: [
                    [{harmony: true, sourceMap: true}, './reactify'],
                    'brfs',
                    'envify',
                ],
                plugin: [
                    ['minifyify', {
                        map: '/static/build/inline.js.map',
                        output: './src/encoded/static/build/inline.js.map',
                        compressPath: compressPath,
                        uglify: {mangle: process.env.NODE_ENV == 'production'},
                    }],
                ],
            },
            browser: {
                dest: './src/encoded/static/build/bundle.js',
                src: [
                    './src/encoded/static/libs/compat.js', // The shims should execute first
                    './src/encoded/static/libs/sticky_header.js',
                    './src/encoded/static/libs/respond.js',
                    './src/encoded/static/libs/bootstrap.js', // simply requires all bootstrap plugins
                    './src/encoded/static/browser.js',
                ],
                options: {
                    debug: true,
                },
                external: [
                    'brace',
                    'brace/mode/json',
                    'brace/theme/solarized_light',
                    'scriptjs',
                    'google-analytics',
                ],
                require: [
                    'domready',
                    'jquery',
                    'react',
                    'underscore',
                    'url',
                ],
                shim: {
                    'affix': {path: require.resolve('bootstrap/js/affix'), exports: null, depends: {jquery: 'jQuery'}},
                    'alert': {path: require.resolve('bootstrap/js/alert'), exports: null, depends: {jquery: 'jQuery'}},
                    'button': {path: require.resolve('bootstrap/js/button'), exports: null, depends: {jquery: 'jQuery'}},
                    'carousel': {path: require.resolve('bootstrap/js/carousel'), exports: null, depends: {jquery: 'jQuery'}},
                    'collapse': {path: require.resolve('bootstrap/js/collapse'), exports: null, depends: {jquery: 'jQuery'}},
                    'dropdown': {path: require.resolve('bootstrap/js/dropdown'), exports: null, depends: {jquery: 'jQuery'}},
                    'modal': {path: require.resolve('bootstrap/js/modal'), exports: null, depends: {jquery: 'jQuery'}},
                    'popover': {path: require.resolve('bootstrap/js/popover'), exports: null, depends: {jquery: 'jQuery', 'tooltip': null}},
                    'scrollspy': {path: require.resolve('bootstrap/js/scrollspy'), exports: null, depends: {jquery: 'jQuery'}},
                    'tab': {path: require.resolve('bootstrap/js/tab'), exports: null, depends: {jquery: 'jQuery'}},
                    'tooltip': {path: require.resolve('bootstrap/js/tooltip'), exports: null, depends: {jquery: 'jQuery'}},
                    'transition': {path: require.resolve('bootstrap/js/transition'), exports: null, depends: {jquery: 'jQuery'}},
                },
                transform: [
                    [{harmony: true, sourceMap: true}, './reactify'],
                    'brfs',
                    'envify',
                ],
                plugin: [
                    ['minifyify', {
                        map: 'bundle.js.map',
                        output: './src/encoded/static/build/bundle.js.map',
                        compressPath: compressPath,
                        uglify: {mangle: process.env.NODE_ENV == 'production'},
                    }],
                ],
            },
            server: {
                dest: './src/encoded/static/build/renderer.js',
                src: ['./src/encoded/static/server.js'],
                options: {
                    builtins: false,
                    debug: true,
                    detectGlobals: false,
                },
                transform: [
                    [{harmony: true, sourceMap: true}, './reactify'],
                    'brfs',
                    'envify',
                ],
                plugin: [
                    ['minifyify', {map:
                        'renderer.js.map',
                        output: './src/encoded/static/build/renderer.js.map',
                        compressPath: compressPath,
                        uglify: {mangle: process.env.NODE_ENV == 'production'},
                    }],
                ],
                external: [
                    'assert',
                    'brace',
                    'brace/mode/json',
                    'brace/theme/solarized_light',
                    'source-map-support',
                ],
                ignore: [
                    'jquery',
                    'd3',
                    'scriptjs',
                    'google-analytics',
                    'ckeditor',
                ],
            },
        },
        copy: {
            ckeditor: {
                expand: true,
                cwd: 'node_modules/node-ckeditor',
                src: 'ckeditor/**',
                dest: 'src/encoded/static/build/',
            }
        },
    });

    grunt.registerMultiTask('browserify', function () {
        var browserify = require('browserify');
        var shim = require('browserify-shim');
        var path = require('path');
        var fs = require('fs');
        var data = this.data;
        var done = this.async();
        var options = data.options || {};

        var b = browserify(options);

        if (data.shim) {
            b = shim(b, data.shim);
        }

        var i;
        var reqs = [];
        (data.src || []).forEach(function (src) {
            reqs.push.apply(reqs, grunt.file.expand({filter: 'isFile'}, src).map(function (f) {
                return [path.resolve(f), {entry: true}];
            }));
        });
        (data.require || []).forEach(function (req) {
            if (typeof req === 'string') req = [req];
            reqs.push(req);
        });

        for (i = 0; i < reqs.length; i++) {
            b.require.apply(b, reqs[i]);
        }

        var external = data.external || [];
        for (i = 0; i < external.length; i++) {
            b.external(external[i]);
        }

        options.filter = function (id) {
            return external.indexOf(id) < 0;
        };

        var ignore = data.ignore || [];
        for (i = 0; i < ignore.length; i++) {
            b.ignore(ignore[i]);
        }

        (data.transform || []).forEach(function (args) {
            if (typeof args === 'string') args = [args];
            b.transform.apply(b, args);
        });

        (data.plugin || []).forEach(function (args) {
            if (typeof args === 'string') args = [args];
            b.plugin.apply(b, args);
        });

        var dest = data.dest;
        grunt.file.mkdir(path.dirname(dest));

        var out = fs.createWriteStream(dest);
        b.bundle().pipe(out);
        out.on('close', done);

    });

    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask('default', ['browserify', 'copy']);
};
