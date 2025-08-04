const config = require("openmrs/default-webpack-config");

config.additionalConfig.module= {
  rules:[
    {
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
    },
  ]
}
module.exports = config;
