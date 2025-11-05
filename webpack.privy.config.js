const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './src/client/components/auth/privy-auth.jsx',
    output: {
        path: path.resolve(__dirname, 'bin/client/auth'),
        filename: 'privy-auth-bundle.js',
        publicPath: '/auth/'
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react', '@babel/preset-env']
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
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer']
        }),
        new webpack.DefinePlugin({
            'process.env': JSON.stringify({
                PRIVY_APP_ID: process.env.PRIVY_APP_ID || ''
            })
        })
    ],
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
};