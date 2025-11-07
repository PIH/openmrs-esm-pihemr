const config = require("openmrs/default-webpack-config");

config.additionalConfig.module= {
  rules:[
    {
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
    },
    {
      test: /\.ts$/,
      include: /node_modules\/yoga-layout/,
      use: 'swc-loader',
    },
  ]
}
module.exports = config;
