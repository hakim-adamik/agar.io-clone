const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './src/client/auth/turnkey-auth-react.jsx',
    output: {
        path: path.resolve(__dirname, 'bin/client/auth'),
        filename: 'turnkey-auth-bundle.js',
        library: 'TurnkeyAuthReact',
        libraryTarget: 'window'
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
            "process": require.resolve("process/browser.js")
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
                TURNKEY_ORGANIZATION_ID: process.env.TURNKEY_ORGANIZATION_ID || '',
                TURNKEY_AUTH_PROXY_PUBLIC_KEY: process.env.TURNKEY_AUTH_PROXY_PUBLIC_KEY || '',
                GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
                APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID || '',
                DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || ''
            })
        })
    ],
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
};