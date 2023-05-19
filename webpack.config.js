const CopyPlugin = require('copy-webpack-plugin');
const RemovePlugin = require('remove-files-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")


module.exports = {
  entry: {
    main: './assets/js/index.js',
    analytics: './assets/js/analytics.js',
  },
  module: {
    rules: [
      {
        test: require.resolve("./assets/vendor/js/jquery-3.6.0.min.js"),
        loader: "exports-loader",
        options: {
          exports: "default jQuery",
        },
      },
      {
        test: require.resolve("./assets/vendor/js/imagesloaded.v4.1.4.js"),
        loader: "exports-loader",
        options: {
          exports: "default imagesLoaded",
        },
      },
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
                  corejs: '3.25.5',
                  useBuiltIns: "usage"
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
    new NodePolyfillPlugin(),
    new Dotenv({
      safe: true,
      expand: true,
      allowEmptyValues: true,
      systemvars: true,
      silent: true
    }),
    new RemovePlugin({ before: {include: ['public/assets']}}),
    new CopyPlugin({
      patterns: [
        {
          from: './assets/css/*',
          to({ context, absoluteFilename }) {
            return "[source]".replace("assets", "");
          },
        },
        {
          from: './assets/vendor/css/**/*',
          to({ context, absoluteFilename }) {
            return "[source]".replace("assets", "");
          },
        },
      ],
    }),
  ],
};
