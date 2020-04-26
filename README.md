# egg-mongoose-framework

项目重新命名为 egg-mongoose-framework

### 特性

- 自动加载 app/schema 目录中，按照 mongoose 的 schema 规范定义的 schema 文件。
- 根据 app/schema 中的配置自动生成同名 service 和 controller，并可直接在 router.js 中使用对应的 controller。
- 按照约定，controller 和 service 目录中，可直接使用 module.exports = {} 定义，不再需要继承 egg.Service 和 egg.Controller。
- 可自定义 app/service/mixin.js 和 app/controller/mixin.js，框架将自动挂载对应的方法到根据 schema 生成的 service 和 controller 中，可以非常方便的实现对应 schema 的 RESTful 接口。
-

### 配置

```js
config.schema = {
  service: true, // 是否自动生成 service
  controller: true, // 是否自动生成 controller
};
```

### 使用教程

1. npm install egg-mongoose-framework
2. 在项目 package.json 中定义 egg 字段，指定 framework。

package.json:

```
{
  "egg": {
    "framework": "egg-mongoose-framework"
  },
}

```

3. 定义 app/schema 文件，例如：user.js
4. 定义 app/controller/mixin.js，其中定义 create、destroy、update、show、index 5 个方法
5. router.js 中定义路由：

```
router.resources('user', '/api/user', controller.user);
```

6. 此时已可使用 `/api/user` 这个路由调用对应的 RESTful 接口，
