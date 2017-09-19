'use strict' ;

const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const AssetsPlugin = require('assets-webpack-plugin');
const path = require('path');
const rimraf = require('rimraf');

module.exports = {
  context: path.join(__dirname, 'src/public'),
  entry: {
    main: './javascripts/main',
  },
  output: {
    path: path.join(__dirname, 'build/public'),
    filename: 'javascripts/[name].[chunkhash].js',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
        }
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract({ 
          loader: 'css-loader',
          options: { minimize: true }
        })
      }
    ]
  },
  plugins: [
    {
      apply: (compiler) => rimraf.sync(path.join(__dirname, 'build'))
    },
    new ExtractTextPlugin('stylesheets/[name].[chunkhash].css'),
    new AssetsPlugin({
      filename: 'assets.json',
      path: path.join(__dirname, 'build/public'),
      prettyPrint: true
    }),
    new UglifyJsPlugin(),

    // new HtmlWebpackPlugin({template: './src/index.html'})
    new CopyWebpackPlugin([
      { 
        from: path.join(__dirname, 'src'), 
        to: path.join(__dirname, 'build'), 
      }
    ], {
      ignore: [   
          'public/javascripts/*',
          'public/stylesheets/*',
      ],

      // By default, we only copy modified files during
      // a watch or webpack-dev-server build. Setting this
      // to `true` copies all files.
      copyUnmodified: true
    }),
  ]
};