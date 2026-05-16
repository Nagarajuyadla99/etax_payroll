const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * Optional dev proxy: requests to /api/* → FastAPI :9000.
 * Primary client config still uses REACT_APP_API_BASE_URL; this helps same-origin tooling.
 */
module.exports = function setupProxy(app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: process.env.REACT_APP_PROXY_TARGET || "http://localhost:9000",
      changeOrigin: true,
      logLevel: "warn",
    })
  );
};
