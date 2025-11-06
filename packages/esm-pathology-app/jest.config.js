const rootConfig = require('../../jest.config.js');

module.exports = {
  ...rootConfig,
  setupFilesAfterEnv: [...rootConfig.setupFilesAfterEnv, '<rootDir>/src/setup-tests.ts'],
  moduleNameMapper: {
    ...rootConfig.moduleNameMapper,
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy',
  },
};
