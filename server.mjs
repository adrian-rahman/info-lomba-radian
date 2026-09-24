import http from 'node:http';
import { handleRequest } from './lib/handler.mjs';

const server = http.createServer((req, res) => handleRequest(req, res));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

server.listen(port, host, () => {
  console.log(`Matek Ambis siap di http://${host}:${server.address().port}\nAdmin: /#admin\nBuat akun admin: npm run admin -- admin`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
