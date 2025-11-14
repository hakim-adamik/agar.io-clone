module.exports = (isProduction) => ({
    entry: "./src/client/js/app.js",
    mode: isProduction ? 'production' : 'development',
    output: {
        library: "app",
        filename: "app.js"
    },
    devtool: false,
    module: {
        rules: getRules(isProduction)
    },
    optimization: isProduction ? {
        minimize: true,
        minimizer: [
            new (require('terser-webpack-plugin'))({
                terserOptions: {
                    compress: {
                        drop_console: false, // Keep console logs for compatibility
                        drop_debugger: false,
                        passes: 1 // Single pass to avoid over-optimization
                    },
                    mangle: false, // Don't mangle names to preserve compatibility
                    format: {
                        comments: false
                    }
                },
                extractComments: false
            })
        ]
    } : {}
});

function getRules(isProduction) {
    return [];  // Disable all webpack rules to test if Babel is causing issues
}
