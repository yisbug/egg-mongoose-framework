'use strict';

module.exports = () => {
  const config = {};

  config.schema = {
    service: true, // 是否自动生成 service
    controller: true, // 是否自动生成 controller
  };

  return config;
};
