const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

// Load package.json for configuration variables
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const buildMode = process.env.NODE_ENV || 'development';
const isProd = buildMode === 'production';

module.exports = {
    mode: buildMode,
    stats: isProd ? 'errors-warnings' : 'minimal',

    entry: isProd ? {
    // Production: single entry point for minimum files
        app: ['./src/vendors.js', './src/index.js']
    } : {
    // Development: separate entries for better debugging
        ilmcharts: './src/index.js',
        vendors: './src/vendors.js'
    },

    output: {
        filename: isProd ? 'js/[name].min.js' : 'js/[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '', // Use relative paths instead of absolute server root paths
        assetModuleFilename: isProd ? '[path][name][ext]' : '[path][name][ext]',
        clean: {
            keep: /\.(txt|csv|conf|php|html)$/
        }
    },

    plugins: [
    // Generate index.html from pug template
        new HtmlWebpackPlugin({
            template: './src/pug/index.pug',
            filename: 'index.html',
            chunks: isProd ? ['app'] : ['vendors', 'ilmcharts'],
            inject: 'body', // Changed from false to body for proper script injection
            scriptLoading: 'blocking', // Changed from defer to blocking for proper order
            hash: isProd, // Add hash as query parameter in production
            minify: isProd ? {
                collapseWhitespace: true,
                removeComments: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true
            } : false,
            templateParameters: {
                dev: !isProd,
                opt: {
                    title: pkg.description || 'Ilmajaam',
                    name: pkg.name,
                    lang: pkg.language || 'et',
                    charset: pkg.charset || 'utf-8',
                    desc: pkg.description || 'Ilmajaam - Ilmavaatluse ja andmete visualiseerimise rakendus',
                    giturl: (pkg.repository && pkg.repository.url) || '',
                    css: `css/${pkg.name}`,
                    js: `js/${pkg.name}`,
                    contrib: 'js/libs',
                    version: pkg.version
                }
            }
        }),
        // CSS extraction
        new MiniCssExtractPlugin({
            filename: isProd ? 'css/[name].min.css' : 'css/[name].css',
            chunkFilename: isProd ? 'css/[id].css' : 'css/[id].css'
        }),

        // Provide jQuery and Underscore globally
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.$': 'jquery',
            'window.jQuery': 'jquery',
            _: 'underscore',
            'window._': 'underscore',
            Highcharts: 'highcharts',
            'window.Highcharts': 'highcharts',
            SunCalc: 'suncalc',
            'window.SunCalc': 'suncalc'
        }),

        // Custom plugin to create symlink to archive directory
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tapAsync('CreateArchiveSymlink', (compilation, callback) => {
                    const distPath = path.resolve(__dirname, 'dist');
                    const archivePath = path.resolve(__dirname, 'archive');
                    const symlinkPath = path.join(distPath, 'archive');

                    // Remove existing symlink/directory if it exists
                    if (fs.existsSync(symlinkPath)) {
                        if (fs.lstatSync(symlinkPath).isSymbolicLink()) {
                            fs.unlinkSync(symlinkPath);
                        } else {
                            console.warn('Warning: dist/archive exists but is not a symlink');
                        }
                    }

                    // Create symlink to archive directory
                    try {
                        fs.symlinkSync(archivePath, symlinkPath, 'dir');
                        console.log('✓ Created symlink: dist/archive -> ../archive');
                    } catch (error) {
                        console.error('Failed to create archive symlink:', error.message);
                    }

                    callback();
                });
            }
        }
    ],

    module: {
        rules: [
            // Pug template processing
            {
                test: /\.pug$/,
                use: [
                    {
                        loader: 'pug-loader',
                        options: {
                            pretty: !isProd
                        }
                    }
                ]
            },

            // SCSS/CSS processing
            {
                test: /\.(sa|sc|c)ss$/,
                use: [
                    MiniCssExtractPlugin.loader, // Always extract CSS to prevent FOUC
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: !isProd
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: !isProd,
                            postcssOptions: {
                                plugins: [
                                    ['postcss-preset-env', {
                                        browsers: 'last 2 versions'
                                    }]
                                ]
                            }
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: !isProd,
                            sassOptions: {
                                silenceDeprecations: ['mixed-decls', 'color-functions', 'global-builtin', 'import'],
                                includePaths: [
                                    path.resolve(__dirname, 'node_modules'),
                                    path.resolve(__dirname, 'src/css')
                                ]
                            }
                        }
                    }
                ]
            },

            // JavaScript processing
            {
                test: /\.js$/,
                exclude: /node_modules/,
                include: [
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'contrib')
                ],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        sourceMap: !isProd
                    }
                }
            },

            // Image processing
            {
                test: /\.(ico|png|jp?g|webp|svg)$/,
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 8 * 1024 // 8KB
                    }
                },
                generator: {
                    filename: isProd ? 'css/images/[name].[contenthash:8][ext]' : 'css/images/[name][ext]'
                }
            },

            // Font processing
            {
                test: /\.(woff|woff2|eot|ttf)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name][ext]'
                }
            }
        ]
    },

    resolve: {
        extensions: ['.js', '.json', '.scss', '.css'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@css': path.resolve(__dirname, 'src/css'),
            '@js': path.resolve(__dirname, 'src/js'),
            '@images': path.resolve(__dirname, 'src/css/images'),
            '@contrib': path.resolve(__dirname, 'contrib')
        }
    },

    optimization: {
        splitChunks: isProd ? false : {
            // Development: keep chunks split for better debugging
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'all',
                    priority: 10
                },
                highcharts: {
                    test: /[\\/]contrib[\\/]highcharts[\\/]/,
                    name: 'highcharts',
                    chunks: 'all',
                    priority: 15
                }
            }
        },
        runtimeChunk: isProd ? false : 'single'
    },

    devtool: isProd ? false : 'eval-source-map',

    devServer: {
        static: {
            directory: path.join(__dirname, 'dist')
        },
        compress: true,
        port: 8080,
        hot: true,
        historyApiFallback: true,
        open: true
    }
};
