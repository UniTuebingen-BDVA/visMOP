const path = require('path')
module.exports = {
  "parallel": false,
  outputDir: path.resolve(__dirname, '../dist/'),
  assetsDir: './static',

  transpileDependencies: ['vuetify'],
  chainWebpack: (config) => {
    config.resolve.extensions.prepend(...['.ts', '.glsl'])
    config.module
      .rule('ts')
      .test(/\.ts$/)
      .use('ts-loader')
      .loader('ts-loader')
      .options({
        configFile: 'tsconfig.json',
        allowTsInNodeModules: true,
        appendTsSuffixTo: [/\.vue$/]
      })
      .end()
    config.module
      .rule('glsl')
      .test(/\.glsl$/)
      .use('raw-loader')
      .loader('raw-loader')
      .end()
  }
}
