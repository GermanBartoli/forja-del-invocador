import {onRequestGet as grieta} from '../functions/api/grieta.js';
import {onRequestGet as jugador} from '../functions/api/player.js';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const rutas = {'/api/player':jugador,'/api/grieta':grieta};
    if (Object.hasOwn(rutas,url.pathname)) {
      if (request.method !== 'GET') { response.writeHead(405).end(); return; }
      const resultado = await rutas[url.pathname]({desarrolloLocal:true,request:new Request(url),env:{RIOT_API_KEY:process.env.RIOT_API_KEY}});
      response.writeHead(resultado.status,Object.fromEntries(resultado.headers));
      response.end(await resultado.text());
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const content = await readFile(file);
    response
      .writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
      .end(content);
  } catch {
    response.writeHead(404).end('No encontrado');
  }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', function () {console.log('http://127.0.0.1:'+this.address().port);});
