const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
    entry: './src/client/components/auth/privy-auth.jsx',
    output: {
        path: path.resolve(__dirname, 'bin/client/auth'),
        filename: '[name].privy-auth-bundle.js',
        chunkFilename: '[name].privy-chunk.js'
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-react', {
                                runtime: 'automatic'
                            }],
                            ['@babel/preset-env', {
                                targets: "> 0.25%, not dead",
                                modules: false,
                                useBuiltIns: 'usage',
                                corejs: 3
                            }]
                        ],
                        plugins: [
                            '@babel/plugin-syntax-dynamic-import'
                        ]
                    }
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx', '.mjs'],
        fallback: {
            "crypto": require.resolve("crypto-browserify"),
            "stream": require.resolve("stream-browserify"),
            "buffer": require.resolve("buffer/"),
            "process": require.resolve("process/browser.js"),
            "vm": false,
            "fs": false,
            "path": false
        },
        alias: {
            'process/browser': require.resolve('process/browser.js')
        }
    },
    optimization: {
        minimize: process.env.NODE_ENV === 'production',
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                        drop_debugger: true,
                        pure_funcs: ['console.log'],
                        passes: 2
                    },
                    mangle: {
                        safari10: true
                    },
                    format: {
                        comments: false
                    }
                },
                extractComments: false
            })
        ],
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                    maxSize: 2000000, // 2MB chunks
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true
                }
            }
        },
        runtimeChunk: false,
        moduleIds: 'deterministic',
        sideEffects: false,
        usedExports: true
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer']
        }),
        new webpack.DefinePlugin({
            'process.env': JSON.stringify({
                PRIVY_APP_ID: process.env.PRIVY_APP_ID || ''
            })
        }),
        ...(process.env.ANALYZE === 'true' ? [
            new BundleAnalyzerPlugin({
                analyzerMode: 'static',
                reportFilename: 'privy-bundle-report.html',
                openAnalyzer: false
            })
        ] : [])
    ],
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    performance: {
        hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
        maxEntrypointSize: 500000,
        maxAssetSize: 500000
    }
};