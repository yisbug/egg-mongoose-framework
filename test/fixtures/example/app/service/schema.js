module.exports = {
  customMethod() {
    return 'sync';
  },
  async asyncCustomMethod() {
    return 'async';
  },
  thisCustomMethod() {
    return this.customMethod();
  },
};
