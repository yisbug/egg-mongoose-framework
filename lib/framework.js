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
        // eslint-disable-next-line
        args = [this];
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

// app > plugin > core
// this.loadApplicationExtend();
// this.loadRequestExtend();
// this.loadResponseExtend();
// this.loadContextExtend();
// this.loadHelperExtend();

// this.loadCustomLoader();

// // app > plugin
// this.loadCustomApp();
// // app > plugin
// this.loadService();
// // app > plugin > core
// this.loadMiddleware();
// // app
// this.loadController();
// // app
// this.loadRouter(); // Dependent on controllers

class AppWorkerLoader extends egg.AppWorkerLoader {
  load() {
    this.loadSchema();
    super.load();
    // 自己扩展
  }
  loadSchema() {
    const { app } = this;
    // 处理 schema
    const schemaPaths = this.getLoadUnits().map((unit) => path.join(unit.path, 'app/schema'));
    // 先加载schema
    if (this.app.config.schema) {
      this.loadToApp(schemaPaths, 'schema');
    }
    // 根据schema生成对应的service和controller
    Object.keys(app.schema).forEach((name) => {
      // 添加基础字段
      if (app.config.schema.extendBaseFields) {
        Object.assign(app.schema[name], app.config.schema.baseFields);
      }

      // 扩展字段
      if (app.config.schema.extend && app.config.schema.extend[name]) {
        Object.assign(app.schema[name], app.config.schema.extend[name]);
      }
    });
  }
  loadService(opt) {
    const { app } = this;
    super.loadService(opt);
    app.serviceObjects = {};
    Object.keys(app.serviceClasses).forEach((key) => {
      app.serviceObjects[key] = app.serviceObjects[key] || app.serviceClasses[key];
    });
    // 处理 schema 定义的 service
    Object.keys(app.schema).forEach((name) => {
      if (!app.config.schema.service) return; // 是否开启自动生成 service，默认开启
      app.serviceClasses[name] = this.createSchemaService(name);
      Object.assign(
        app.serviceClasses[name].prototype,
        app.serviceObjects.mixin, // 集成 mixin
        app.serviceObjects[name] // 集成自定义方法
      );
    });
    // 处理剩余 service，支持 module.exports = {} 的写法
    Object.keys(app.serviceObjects).forEach((name) => {
      if (name === 'mixin') return;
      if (app.schema[name]) return;
      const service = app.serviceClasses[name];
      if (typeof service === 'function') {
        app.serviceClasses[name] = service;
      } else {
        app.serviceClasses[name] = this.createEmptyService();
        Object.assign(app.serviceClasses[name].prototype, service);
      }
    });
    delete app.serviceClasses.mixin; // 删除 mixin
  }

  loadController(opt) {
    // egg框架内使用逻辑见: egg/lib/loader line:41 没有参数，加载默认app/controller逻辑
    // 有opt参数，用于其他地方（eg:插件内)加载,调用原方法
    if (opt) {
      return super.loadController(opt)
    }
    const { app } = this;
    // 处理 controller，先把原始controller存放到 controllerObjects
    const controllerPaths = this.getLoadUnits().map((unit) =>
      path.join(unit.path, 'app/controller')
    );
    this.loadToApp(controllerPaths, 'controllerObjects');
    app.controllerObjects = app.controllerObjects || {};

    app.controller = app.controller || {};
    // 遍历 schema
    Object.keys(app.schema).forEach((name) => {
      // 处理 schema 定义的 controller
      if (!app.config.schema.controller) return; // 是否开启自动生成 service，默认开启
      const Controller = this.createSchemaController(name);
      // 集成 mixin 和 自定义方法
      Object.assign(Controller.prototype, app.controllerObjects.mixin, app.controllerObjects[name]);
      app.controller[name] = wrapClass(Controller);
    });
    // 处理剩余的 controller
    Object.keys(app.controllerObjects).forEach((name) => {
      if (app.controller[name]) return;
      if (name === 'eggMongooseBaseController') return;
      if (name === 'mixin') return;
      // 使用 class 定义的 controller
      if (typeof app.controllerObjects[name] === 'function') {
        app.controller[name] = wrapClass(app.controllerObjects[name]);
      } else {
        // 使用 module.exports 定义的 controller
        const Controller = this.createEmptyController();
        Object.assign(Controller.prototype, app.controllerObjects[name]);
        app.controller[name] = wrapClass(Controller);
      }
    });
  }
  createSchemaService(name) {
    class NewService extends this.app.serviceClasses.eggMongooseBaseService {
      get name() {
        return name;
      }
      get model() {
        const { app } = this;
        if (app.model[this.name]) return app.model[this.name];
        const model = app.mongoose.model(this.name, new app.mongoose.Schema(app.schema[this.name]));
        if (!model) throw new Error(`没有找到对应的model:${this.name}`);
        app.model[this.name] = model;
        return app.model[this.name];
      }

      get modelback() {
        const { app } = this;
        const name = `${this.name}_back`;
        console.log('app', app, this, this.app, this.ctx);
        if (app.model[name]) return app.model[name];
        const model = app.mongoose.model(name, new app.mongoose.Schema(app.schema[this.name]));
        if (!model) throw new Error(`没有找到对应的model:${this.name}`);
        app.model[name] = model;
        return app.model[name];
      }

      get schema() {
        return this.app.schema[name];
      }
    }
    return NewService;
  }
  createEmptyService() {
    class NewService extends this.app.serviceClasses.eggMongooseBaseService { }
    return NewService;
  }
  createSchemaController(name) {
    class NewController extends this.app.controllerObjects.eggMongooseBaseController {
      get name() {
        return name;
      }
    }
    return NewController;
  }
  createEmptyController() {
    class NewController extends this.app.controllerObjects.eggMongooseBaseController { }
    return NewController;
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
