const path = require('path');

module.exports = (isProduction) => {
    const outputPath = path.resolve(__dirname, 'bin/client/js');

    return {
        entry: "./src/client/js/app.js",
        mode: isProduction ? 'production' : 'development',
        target: 'web',
        output: {
            library: "app",
            libraryTarget: 'var',
            filename: "app.js",
            path: outputPath
        },
        resolve: {
            extensions: ['.js'],
            modules: [path.resolve(__dirname, 'bin/client/js'), 'node_modules']
        },
        devtool: false,
        module: {
            rules: getRules(isProduction)
        },
        node: {
            global: false,
            __filename: false,
            __dirname: false
        }
    };
};

function getRules(isProduction) {
    if (isProduction) {
        return [
            {
                test: /\.(?:js|mjs|cjs)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', {
                                targets: "defaults",
                                modules: false // Let webpack handle module system
                            }]
                        ]
                    }
                }
            }
        ]
    }
    return [];
}
