'use strict';

// const {resolve} = require('path')

module.exports = {
  entry: './client/index.js',
  output: {
    path: __dirname,
    filename: './public/bundle.js'
  },
  context: __dirname,
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.jsx']
  },
  module: {
    loaders: [
      {
        test: /.js$/,
        // include: resolve(__dirname, './app'),
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /.jsx$/,
        // include: resolve(__dirname, './app'),
        loader: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  }
};
