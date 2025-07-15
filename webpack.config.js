const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');
const HTMLInlineCSSWebpackPlugin = require('html-inline-css-webpack-plugin').default;

module.exports = (env, argv) => ({
mode: argv.mode === 'production' ? 'production' : 'development',

// This is necessary because Figma's 'eval' works differently than normal eval
devtool: argv.mode === 'production' ? false : 'inline-source-map',
  entry: {
    code: './src/code.ts'
  },
  module: {
    rules: [
      // Converts TypeScript code to JavaScript
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
    ],
  },
  // Webpack tries these extensions for you if you omit the extension like "import './file'"
  resolve: {
    extensions: ['.ts','.tsx', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'style.css'}),
    new HtmlWebpackPlugin({
      filename: 'ui.html',
      template: './ui.html',
      chunks: ['code'], // Include only the 'code' chunk (from code.js)
      inject: 'body', // Inject JavaScript into the body
    }),
    new HtmlWebpackPlugin({
      filename: 'vision_simulation.html',
      template: './views/vision_simulation.html',
      chunks: ['code'], // Include only the 'code' chunk (from code.js)
      inject: 'body', // Inject JavaScript into the body
    }),
    new HtmlWebpackPlugin({
      filename: 'color-pattern.html',
      template: './views/color-pattern.html',
      chunks: ['code'], // Include only the 'code' chunk (from code.js)
      inject: 'body', // Inject JavaScript into the body
    }),
    new HtmlWebpackPlugin({
      filename: 'color-contrast.html',
      template: './views/color-contrast.html',
      chunks: ['code'], // Include only the 'code' chunk (from code.js)
      inject: 'body', // Inject JavaScript into the body
    }),
    new HTMLInlineCSSWebpackPlugin({
      styleTagFactory({ style }) {
        return `<style>${style}</style>`;
      },
    }),
  ],
});