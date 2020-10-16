const CopyPlugin = require('copy-webpack-plugin');
const RemovePlugin = require('remove-files-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  node: {
      __dirname: false,
  },
  devtool: "source-map",
  entry: {
    app: './src/boot.js'
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        include: /src/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              "@babel/plugin-proposal-class-properties",
              "@babel/plugin-proposal-private-methods",
              "@babel/plugin-proposal-private-property-in-object"
            ]
          }
        },
      }
    ]
  },
  output: {
    path: __dirname + '/dist/',
    // publicPath: '/public',
    filename: 'src/start.js'
  },
  resolve: {
    extensions: ['*', '.js']
  },
  externals: [nodeExternals()],
  devServer: {
      contentBase: './dist'
  },
  plugins: [
    new RemovePlugin({ before: {include: ['dist']}}),
    new CopyPlugin([
      { from: './src/views/', to: './src/views' },
      { from: './public/', to: './public' }
    ]),
  ],
};