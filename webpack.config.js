const webpack = require('webpack');
const dotenv = require('dotenv');

module.exports = {
  // ... other webpack config
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(dotenv.config().parsed)
    })
  ]
}; 