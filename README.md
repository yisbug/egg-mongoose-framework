# ooo

## 特性

* 自动加载 app/schema。
* 根据app/schema中的配置自动生成同名service和controller。

需要先定义 app/service/base.js 和 app/controller/base.js，自动生成的service和controller均继承自这两个class。

## 配置

``` js
config.schema = {
  extendBaseFields: true, // 是否扩展基础字段
  service: true, // 是否自动生成 service
  controller: true, // 是否自动生成 controller
  baseFields: { // 扩展基础字段
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
    user: {}, // 扩展user表
  },
};
```