const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: {
    server: './bin/www'
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /(node_modules|assets)/,
        use: ['babel-loader']
      },
    ]
  },
  target: "node",
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: [nodeExternals()],
  output: {
    path: __dirname + '/build/',
    publicPath: '/',
    filename: '[name].js'
  }
};