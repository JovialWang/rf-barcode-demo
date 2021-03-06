const path = require('path');

module.exports = {
    //devtool: 'inline-source-map',
    entry: {
        index: './src/index.js'
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [{
            test: /\.css$/,
            use: [{ loader: "style-loader" },
                { loader: "css-loader" }]
        }]
    }
};