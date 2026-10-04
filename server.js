// Servidor local opcional: serve o site e faz a ponte com o TSE (evita bloqueio de CORS).
// Uso: node server.js   →   http://localhost:8080
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORTA = process.env.PORT || 8080;
const DESTINOS = {
  '/tse/': 'resultados.tse.jus.br',
  '/tse-sim/': 'resultados-sim.tse.jus.br'
};

http.createServer((req, res) => {
  if (req.url === '/__proxy_ok') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }

  for (const [prefixo, host] of Object.entries(DESTINOS)) {
    if (req.url.startsWith(prefixo)) {
      const caminho = '/' + req.url.slice(prefixo.length);
      const pedido = https.request({ host, path: caminho, method: 'GET', headers: { 'User-Agent': 'apuracao-local', 'Accept': '*/*' } }, (r) => {
        res.writeHead(r.statusCode || 502, { 'Content-Type': r.headers['content-type'] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        r.pipe(res);
      });
      pedido.on('error', () => { res.writeHead(502); res.end('Falha ao acessar o TSE'); });
      return pedido.end();
    }
  }

  if (req.url === '/' || req.url.startsWith('/?') || req.url.startsWith('/#') || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
  }
  res.writeHead(404); res.end('Não encontrado');
}).listen(PORTA, () => console.log(`Apuração 2026 rodando em http://localhost:${PORTA}`));
