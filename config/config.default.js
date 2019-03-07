'use strict';

module.exports = appInfo => {
  const config = {};

  config.schema = {
    extendBaseFields: true, // 是否扩展基础字段
    service: true, // 是否自动生成 service
    controller: true, // 是否自动生成 controller
    baseFields: { // 基础字段
      createAt: {
        type: Date,
        name: '创建时间',
        default: Date.now,
      },
      creater: {
        type: String,
        name: '创建人',
      },
      lastUpTime: {
        type: Date,
        name: '最后更新时间',
        default: Date.now,
      },
      lastUpUser: {
        type: String,
        name: '最后修改人',
      },
    },
    extend: {
    },
  };

  return config;
};
