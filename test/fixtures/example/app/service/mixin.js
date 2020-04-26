module.exports = {
  async create(payload) {
    await this.model.create(payload);
  },
  async update(id, payload) {
    return await this.model.findOneAndUpdate(id, payload, {
      new: true,
    });
  },
  async destroy(id) {
    await this.model.findByIdAndRemove(id);
  },
  async index(payload = {}) {
    let { isPaging, pageSize = 10, current = 1, search = {} } = payload || {};
    pageSize = Number(pageSize) || 10;
    current = Number(current) || 1;
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
  },
};
