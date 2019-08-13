const CopyPlugin = require('copy-webpack-plugin');
const RemovePlugin = require('remove-files-webpack-plugin');

module.exports = {
  entry: {
    main: './assets/js/index.js'
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        include: /assets/,
        use: ['babel-loader']
      }
    ]
  },
  target: "web",
  devtool: "source-map",
  output: {
    path: __dirname + '/public/assets/',
    publicPath: '/public',
    filename: 'js/bundle.js'
  },
  plugins: [
    new RemovePlugin({ before: {include: ['public/assets']}}),
    new CopyPlugin([
      { from: './assets/css/*', to: '.', transformPath(target, abs) { return target.replace("assets", ""); } }
    ]),
  ],
};