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
        include: /(assets|src\/shared)/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              "@babel/plugin-proposal-class-properties",
              "@babel/plugin-proposal-private-methods",
              "@babel/plugin-proposal-private-property-in-object"
            ],
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: "defaults",
                  useBuiltIns: "entry"
                }
              ]
            ]
          }
        }
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
