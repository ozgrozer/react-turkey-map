const path = require('path')

module.exports = {
  mode: 'production',
  entry: './src/TurkeyMap.jsx',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'TurkeyMap.js',
    library: 'TurkeyMap',
    libraryTarget: 'umd',
    globalObject: 'this',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
}
