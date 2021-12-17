const CopyPlugin = require('copy-webpack-plugin');
const RemovePlugin = require('remove-files-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: {
    main: './assets/js/index.js',
    analytics: './assets/js/analytics.js',
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
    filename: 'js/[name].bundle.js'
  },
  plugins: [
    new Dotenv({
      safe: true,
      expand: true,
      allowEmptyValues: true,
      systemvars: true,
      silent: true
    }),
    new RemovePlugin({ before: {include: ['public/assets']}}),
    new CopyPlugin([
      { from: './assets/css/*', to: '.', transformPath(target, abs) { return target.replace("assets", ""); } },
      { from: './assets/vendor/css/**/*', to: '.', transformPath(target, abs) { return target.replace("assets", ""); } }
    ]),
  ],
};
