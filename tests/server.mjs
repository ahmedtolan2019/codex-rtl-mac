import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
createServer(async(req,res)=>{try{if(req.method!=='GET')throw Error();const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(!path.startsWith(root+sep))throw Error();const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'text/plain'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(8767,'127.0.0.1',()=>console.log('Synthetic RTL fixture: http://127.0.0.1:8767/docs/demo.html'));
