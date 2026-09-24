import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { openStore, hashPassword } from '../lib/store.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('Alur API: autentikasi, upload, draft, publikasi, kategori, persistensi',async t=>{
  const directory=await mkdtemp(resolve(tmpdir(),'info-lomba-test-'));
  const db=openStore(directory,false);
  db.prepare('INSERT INTO admins VALUES (?,?)').run('tester',hashPassword('test-password-long-2026')); db.close();
  let child,base,cookie='';
  async function start(){
    child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DATA_DIR:directory,PORT:'0',HOST:'127.0.0.1',NODE_ENV:'test',SEED_DEMO:'false'},stdio:['ignore','pipe','pipe']});
    base=await new Promise((resolve,reject)=>{let out=''; let err=''; const timer=setTimeout(()=>reject(new Error(`Server timeout: ${err}`)),10000); child.stderr.on('data',d=>err+=d); child.stdout.on('data',d=>{out+=d;const match=/http:\/\/127.0.0.1:\d+/.exec(out);if(match){clearTimeout(timer);resolve(match[0]);}});child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Server exited ${code}: ${err}`));});});
  }
  async function stop(){ if(child && child.exitCode===null){const done=once(child,'exit');child.kill();await done;} }
  const request=async(path,{method='GET',data,authenticated=true,headers={}}={})=>{
    const res=await fetch(`${base}/api${path}`,{method,headers:{'Content-Type':'application/json','X-Requested-With':'info-lomba',...(authenticated&&cookie?{Cookie:cookie}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});
    return {status:res.status,body:await res.json(),headers:res.headers};
  };
  t.after(async()=>{await stop();await rm(directory,{recursive:true,force:true});});
  await start();
  await t.test('Visiteur tidak dapat menulis atau membaca draft',async()=>{
    assert.equal((await request('/competitions?admin=1')).status,401);
    assert.equal((await request('/categories',{method:'POST',data:{name:'Unauthorized'}})).status,401);
    assert.deepEqual((await request('/competitions')).body.competitions,[]);
  });
  await t.test('Login salah ditolak, login benar memberi cookie aman',async()=>{
    assert.equal((await request('/login',{method:'POST',data:{username:'tester',password:'wrong'}})).status,401);
    const res=await request('/login',{method:'POST',data:{username:'tester',password:'test-password-long-2026'}});
    assert.equal(res.status,200);assert.match(res.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);cookie=res.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/session')).body.username,'tester');
  });
  let categoryId,poster,id;
  await t.test('Kategori baru, duplikasi dan request lintas origin',async()=>{
    const res=await request('/categories',{method:'POST',data:{name:'Hackathon Competition'}}); assert.equal(res.status,201);categoryId=res.body.id;
    assert.equal((await request('/categories',{method:'POST',data:{name:'  hackathon   competition  '}})).status,409);
    assert.equal((await request('/categories',{method:'POST',data:{name:'Another'},headers:{Origin:'https://untrusted.example'}})).status,403);
    assert.equal((await request('/categories',{method:'POST',data:{name:'Another'},headers:{'X-Requested-With':''}})).status,403);
  });
  await t.test('Upload gambar sah diterima dan spoofed PNG ditolak',async()=>{
    assert.equal((await request('/upload',{method:'POST',data:{image:'data:image/png;base64,'+Buffer.from('<html>bad</html>').toString('base64')}})).status,400);
    assert.equal((await request('/upload',{method:'POST',data:{image:'data:image/svg+xml;base64,abcd'}})).status,400);
    const res=await request('/upload',{method:'POST',data:{image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII='}});
    assert.equal(res.status,201);poster=res.body.poster; const asset=await fetch(base+poster);assert.equal(asset.status,200);assert.equal(asset.headers.get('content-type'),'image/png');
  });
  const input=()=>({title:'Lomba Uji Integrasi',organizer:'Kampus Uji',categoryId,poster,registrationUrl:'https://example.com/register',startDate:'2026-09-01',endDate:'2026-10-01',fee:0,description:'Deskripsi lomba',format:'Online',publication:'draft'});
  await t.test('Draft tidak muncul ke publik; validasi berlaku di server',async()=>{
    const res=await request('/competitions',{method:'POST',data:input()});assert.equal(res.status,201);id=res.body.id;
    assert.equal((await request('/competitions')).body.competitions.length,0);
    assert.equal((await request('/competitions?admin=1')).body.competitions.length,1);
    assert.equal((await request('/competitions',{method:'POST',data:{...input(),fee:-1}})).status,400);
    assert.equal((await request('/competitions',{method:'POST',data:{...input(),endDate:'2026-08-01'}})).status,400);
    assert.equal((await request('/competitions',{method:'POST',data:{...input(),registrationUrl:'javascript:alert(1)'}})).status,400);
    assert.equal((await request('/competitions',{method:'POST',data:{...input(),poster:'/posters/not-found.svg'}})).status,400);
  });
  await t.test('Publikasi, biaya nol, kategori terpakai dan update',async()=>{
    assert.equal((await request(`/competitions/${id}`,{method:'PUT',data:{...input(),publication:'published'}})).status,200);
    const published=(await request('/competitions')).body.competitions;assert.equal(published.length,1);assert.equal(published[0].fee,0);assert.equal(published[0].isDemo,false);
    assert.equal((await request(`/categories/${categoryId}`,{method:'DELETE'})).status,409);
    assert.equal((await request(`/competitions/${id}`,{method:'PUT',authenticated:false,data:input()})).status,401);
  });
  await t.test('Data dan sesi bertahan setelah restart',async()=>{
    await stop();await start();assert.equal((await request('/competitions')).body.competitions[0].id,id);assert.equal((await request('/session')).body.username,'tester');
  });
  await t.test('Hapus lomba lalu kategori dan logout',async()=>{
    assert.equal((await request(`/competitions/${id}`,{method:'DELETE'})).status,200);
    assert.equal((await request(`/competitions/${id}`,{method:'DELETE'})).status,404);
    assert.equal((await request(`/categories/${categoryId}`,{method:'DELETE'})).status,200);
    assert.equal((await request('/logout',{method:'POST'})).status,200);
    assert.equal((await request('/competitions?admin=1')).status,401);
  });
  await t.test('Berkas internal tidak terekspos dan keamanan HTML aktif',async()=>{
    for(const path of ['/data/info-lomba.sqlite','/server.mjs','/ADMIN-ACCESS.txt','/../server.mjs','/uploads/%2e%2e%2finfo-lomba.sqlite']) assert.equal((await fetch(base+path)).status,404);
    const page=await fetch(base);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  });
});
