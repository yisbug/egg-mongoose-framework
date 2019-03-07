'use strict';

const path = require('path');
const egg = require('egg');

const EGG_PATH = Symbol.for('egg#eggPath');
const EGG_LOADER = Symbol.for('egg#loader');

function callFn(fn, args, ctx) {
  args = args || [];
  return ctx ? fn.call(ctx, ...args) : fn(...args);
}

// wrap the class, yield a object with middlewares
function wrapClass(Controller) {
  let proto = Controller.prototype;
  const ret = {};
  // tracing the prototype chain
  while (proto !== Object.prototype) {
    const keys = Object.getOwnPropertyNames(proto);
    for (const key of keys) {
      // getOwnPropertyNames will return constructor
      // that should be ignored
      if (key === 'constructor') {
        continue;
      }
      // skip getter, setter & non-function properties
      const d = Object.getOwnPropertyDescriptor(proto, key);
      // prevent to override sub method
      if (typeof d.value === 'function' && !ret.hasOwnProperty(key)) {
        ret[key] = methodToMiddleware(Controller, key);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return ret;

  function methodToMiddleware(Controller, key) {
    return function classControllerMiddleware(...args) {
      const controller = new Controller(this);
      if (!this.app.config.controller || !this.app.config.controller.supportParams) {
        args = [ this ];
      }
      return callFn(controller[key], args, controller);
    };
  }
}

// loader 加载顺序：
// package.json -> config/plugin.* -> config/config.* -> app/extend/application
// -> app/extend/request -> app/extend/response -> app/extend/context -> app/extend/helper
// -> agent.js -> app.js -> app/service -> app/middleware -> app/controller
// -> router.js

// 文件顺序
// 上面已经列出了默认会加载的文件，Egg 会按如下文件顺序加载，每个文件或目录再根据 loadUnit 的顺序去加载（应用、框架、插件各有不同）。

// 加载 plugin，找到应用和框架，加载 config/plugin.js
// 加载 config，遍历 loadUnit 加载 config/config.{env}.js
// 加载 extend，遍历 loadUnit 加载 app/extend/xx.js
// 自定义初始化，遍历 loadUnit 加载 app.js 和 agent.js
// 加载 service，遍历 loadUnit 加载 app/service 目录
// 加载 middleware，遍历 loadUnit 加载 app/middleware 目录
// 加载 controller，加载应用的 app/controller 目录 。 =======注： 只加载应用的controller
// 加载 router，加载应用的 app/router.js 。 =======注： 只加载应用的router

// 所以这里应该在加载controller结束后再去加载schema，并注入到service,controller
class AppWorkerLoader extends egg.AppWorkerLoader {

  createService(name) {
    class NewService extends this.app.serviceClasses.base {
      get name() { return name; }
    }
    return NewService;
  }

  createController(name) {
    class NewController extends this.app.BaseController {
      constructor(ctx) {
        super(ctx);
        this.name = name;
      }
    }
    return NewController;
  }

  loadController() {
    // super.loadController();
    // 加载schema
    this.loadSchema();
  }

  loadSchema() {
    const { app } = this;
    const schemaPaths = this.getLoadUnits().map(unit => path.join(unit.path, 'app/schema'));
    
    // 先加载schema
    if (app.config.schema) {
      this.loadToApp(schemaPaths, 'schema');
    }

    // 默认只加载应用的app/controller，修改为加载所有加载单元的controller。
    super.loadController({
      directory: this.getLoadUnits().map(unit => path.join(unit.path, 'app/controller')),
    });

    // 根据schema生成对应的service和controller
    Object.keys(app.schema).forEach(name => {

      // 添加基础字段
      if (app.config.schema.extendBaseFields) {
        Object.assign(app.schema[name], app.config.schema.baseFields);
      }

      // 扩展字段
      if (app.config.schema.extend && app.config.schema.extend[name]) {
        Object.assign(app.schema[name], app.config.schema.extend[name]);
      }

      // 支持覆盖service
      if (app.config.schema.service) {
        const customService = this.app.serviceClasses[name];
        this.app.serviceClasses[name] = this.createService(name);
        if (customService) {
          Object.assign(this.app.serviceClasses[name].prototype, customService);
        }
      }

      // 不支持覆盖controller
      if (app.config.schema.controller && !this.app.controller[name]) {
        this.app.controller[name] = wrapClass(this.createController(name));
      }
      
    });
  }
}

class Application extends egg.Application {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
  // 覆盖 Egg 的 Loader，启动时使用这个 Loader
  get [EGG_LOADER]() {
    return AppWorkerLoader;
  }
}

class Agent extends egg.Agent {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
}

module.exports = Object.assign(egg, {
  Application,
  Agent,
  // 自定义的 Loader 也需要 export，上层框架需要基于这个扩展
  AppWorkerLoader,
});
