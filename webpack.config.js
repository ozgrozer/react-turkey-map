const path = require('path')

const browserConfig = {
  mode: 'production',
  target: 'web',
  entry: './src/TurkeyMap.jsx',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'TurkeyMap.web.js',
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
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM'
  }
}

const nodeConfig = {
  mode: 'production',
  target: 'node',
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
  },
  externals: {
    react: 'commonjs react',
    'react-dom': 'commonjs react-dom'
  }
}

module.exports = [browserConfig, nodeConfig]
