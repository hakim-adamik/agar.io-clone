#!/usr/bin/env node
/**
 * Build script for webpack bundles
 * Used during Docker build to create client JS and Privy auth bundle
 */

const webpack = require('webpack');
const path = require('path');

// Build client app.js
const appConfig = require('./webpack.config.js')(true); // true = production
appConfig.output.path = path.resolve(__dirname, 'bin/client/js');

// Build Privy auth bundle
const privyConfig = require('./webpack.privy.config.js');

const compiler = webpack([appConfig, privyConfig]);

compiler.run((err, stats) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log(stats.toString({
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false
    }));

    if (stats.hasErrors()) {
        process.exit(1);
    }

    console.log('\n✅ Webpack bundles built successfully!');
    compiler.close((closeErr) => {
        if (closeErr) {
            console.error(closeErr);
            process.exit(1);
        }
    });
});

