/**
 * 本地前端托管：静态文件 + /api 反代到 Spring Boot。
 *
 * 替代 src/main/resources/nginx-1.18.0 里那份 Windows 版 nginx
 * （只有 nginx.exe，Linux 上跑不了）。用 Node 内置 http 模块实现，
 * 零依赖、零安装、无需 sudo，删掉本文件即彻底清理。
 *
 * 用法（先启动后端 HmDianPingApplication）：
 *     node serve.js            # 默认 8080
 *     PORT=8082 node serve.js  # 8080 被占用时换端口
 *
 *   前端页面  http://localhost:8080
 *   后端接口  http://localhost:8081
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const BACKEND = { host: '127.0.0.1', port: 8081 };
const ROOT = path.join(__dirname, 'src/main/resources/nginx-1.18.0/html/hmdp');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

// 对应 nginx.conf 里的 rewrite /api(/.*) $1 break; + proxy_pass
function proxy(req, res, targetPath) {
  const upstream = http.request(
    {
      host: BACKEND.host,
      port: BACKEND.port,
      method: req.method,
      path: targetPath,
      headers: { ...req.headers, host: `${BACKEND.host}:${BACKEND.port}` },
    },
    (up) => {
      res.writeHead(up.statusCode, up.headers);
      up.pipe(res);
    }
  );

  upstream.on('error', (err) => {
    console.error(`[proxy] ${req.method} ${targetPath} -> ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, errorMsg: '后端未启动或不可达 (127.0.0.1:8081)' }));
  });

  req.pipe(upstream);
}

function serveStatic(req, res, urlPath) {
  const rel = decodeURIComponent(urlPath.split('?')[0]);
  let filePath = path.join(ROOT, rel);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');

    fs.readFile(filePath, (readErr, buf) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`404 Not Found: ${rel}`);
        return;
      }
      const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(buf);
    });
  });
}

const server = http.createServer((req, res) => {
  const url = req.url;
  if (url === '/api' || url.startsWith('/api/')) {
    proxy(req, res, url.slice(4) || '/');
  } else {
    serveStatic(req, res, url === '/' ? '/index.html' : url);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用。换一个端口重试，例如：`);
    console.error(`    PORT=8082 node serve.js`);
    console.error(`查占用者： ss -ltnp | grep :${PORT}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`前端已启动: http://localhost:${PORT}`);
  console.log(`静态目录  : ${ROOT}`);
  console.log(`/api 反代 : http://${BACKEND.host}:${BACKEND.port}`);
});
