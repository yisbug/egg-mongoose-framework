const mock = require('egg-mock');
const assert = require('assert');
describe('test/framework.test.js', () => {
  let app;
  before(() => {
    app = mock.app({
      baseDir: 'example',
      framework: true,
    });
    return app.ready();
  });

  after(() => app.close());

  afterEach(mock.restore);

  it('should GET /', () => {
    return app.httpRequest().get('/').expect('hello world.');
  });

  it('schame', () => {
    const ctx = app.mockContext({});
    assert.equal(typeof ctx.service.schema.customMethod, 'function');
    assert.equal(typeof ctx.service.schema.asyncCustomMethod, 'function');
    assert.equal(ctx.service.schema.thisCustomMethod(), 'sync');
  });

  it('user', async () => {
    const ctx = app.mockContext({});

    app.httpRequest().get('/api/user').expect(200);

    assert.equal(typeof ctx.service.user.index, 'function');
    assert.equal(ctx.service.user.getUsername(), 'test123');
    assert.equal(ctx.service.user.name, 'user');
  });
});
