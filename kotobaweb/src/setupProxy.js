const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setup(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost',
      changeOrigin: true,
    }),
  );
};
