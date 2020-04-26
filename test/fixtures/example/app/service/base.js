const { Service } = require('egg');

class BaseService extends Service {
  get schema() {
    return this.app.schema[this.name];
  }

  get model() {
    const { app } = this;
    if (app.model[this.name]) return app.model[this.name];
    const model = app.mongoose.model(this.name, new app.mongoose.Schema(app.schema[this.name]));
    if (!model) throw new Error(`没有找到对应的model:${this.name}`);
    app.model[this.name] = model;
    return app.model[this.name];
  }

  getCondition(id) {
    const { ObjectId } = this.app.mongoose.Types.ObjectId;
    try {
      return typeof id === 'object' ? id : { _id: ObjectId(id) };
    } catch (e) {
      this.ctx.error(400, 'ObjectId 参数错误');
    }
  }

  // 执行存储过程
  async execSystemJs(cmd, dbname = 'db2') {
    const { db } = this.app.mongooseDB.get(dbname);
    this.logger.info(`正在执行存储过程：${cmd}`);
    const t = Date.now();
    const { retval } = await db.command({
      eval: cmd,
      args: null,
      nolock: true,
    });
    if (retval && retval._id) {
      delete retval._id;
    }
    this.logger.info(`执行存储过程结束，耗时：${Date.now() - t}ms`);
    return retval || {};
  }

  async loopRows(search, callback) {
    const { model } = this;
    const total = await model.countDocuments(search).exec();
    if (total === 0) return;
    const pageSize = 10000;
    const maxPage = Math.ceil(total / pageSize);
    let page = 1;
    while (page <= maxPage) {
      this.logger.info(
        `搜索${this.name}表，${JSON.stringify(search)}，总条数:${total}，页码:${page}/${maxPage}`
      );
      const skip = (page - 1) * pageSize;
      const rows = await model.find(search).skip(skip).limit(pageSize);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        await callback(row);
      }
      page++;
    }
  }

  // 查找一条记录
  async findOne(id) {
    return this.model.findOne(this.getCondition(id));
  }

  // 查找多条记录
  async find(search) {
    return this.model.find(search);
  }

  // 获取详情
  async show(id) {
    const doc = await this.findOne(id);
    if (!doc) this.ctx.error(404, '记录不存在');
    return doc;
  }

  getActionUser() {
    if (this.ctx.user && this.ctx.user.username) return this.ctx.user.username;
    return 'system';
  }

  // 新增
  async create(payload) {
    payload.createTime = payload.createTime || new Date();
    payload.creator = payload.creator || this.getActionUser();
    return this.model.create(payload);
  }

  // 删除
  async destroy(id) {
    const doc = await this.findOne(id);
    if (!doc) this.ctx.error(404, '记录不存在');
    return this.model.findByIdAndRemove(id);
    // return this.model.findOneAndUpdate(
    //   this.getCondition(id),
    //   { isDeleted: true },
    //   {
    //     new: true,
    //   }
    // );
  }

  // 批量删除
  async removes(payload) {
    return this.model.remove({ _id: { $in: payload } });
    // return this.model.update({ _id: { $in: payload } }, { isDeleted: true });
  }

  // 修改，返回修改后的数据
  async update(id, payload) {
    const doc = await this.findOne(id);
    if (!doc) this.ctx.error(404, '记录不存在');
    payload.updateTime = payload.updateTime || new Date();
    payload.modifier = payload.modifier || this.getActionUser();
    return this.model.findOneAndUpdate(this.getCondition(id), payload, {
      new: true,
    });
  }

  // 修改，如不存在则插入，返回修改后的数据
  async upsert(id, payload) {
    return this.model.findOneAndUpdate(this.getCondition(id), payload, {
      upsert: true,
      new: true,
    });
  }

  // 列表
  async index(payload = {}) {
    // eslint-disable-next-line
    let { isPaging, pageSize = 10, current = 1, search = {} } = payload || {};
    pageSize = Number(pageSize) || 10;
    current = Number(current) || 1;
    // if (typeof search.isDeleted === 'undefined') {
    // search.isDeleted = false;
    // }

    const skip = (current - 1) * pageSize;
    let query = this.model.find(search);
    if (isPaging) {
      query = query.skip(skip).limit(pageSize).sort({ _id: -1 });
    }
    const res = await query.exec();
    const total = await this.model.countDocuments(search).exec();
    return {
      list: res.map((e) => {
        return { key: e._doc._id, ...e._doc };
      }),
      pagination: isPaging ? { total, pageSize, current } : { total },
    };
  }
}

module.exports = BaseService;
