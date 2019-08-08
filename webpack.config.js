const CopyPlugin = require('copy-webpack-plugin');

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
    path: __dirname + '/public/',
    publicPath: '/public',
    filename: 'bundle.js'
  },
  plugins: [
    new CopyPlugin([
      { from: './assets/css/*', to: '.', transformPath(target, abs) { return target.replace("assets", ""); } },
      { from: './assets/img/*', to: '.', transformPath(target, abs) { return target.replace("assets", ""); } }
    ]),
  ],
};