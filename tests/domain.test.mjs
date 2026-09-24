import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationStatus, todayJakarta, validateCompetition, validDate } from '../lib/domain.mjs';
const categories=[{id:1,name:'Data Science Competition'}];
const valid={title:'Lomba Mahasiswa',organizer:'Kampus',categoryId:1,registrationUrl:'https://example.com/register',startDate:'2026-09-01',endDate:'2026-09-30',fee:0,poster:'/posters/data.svg',publication:'published'};
test('Status inklusif pada hari pembukaan dan penutupan',()=>{
  assert.equal(registrationStatus(valid,'2026-08-31'),'upcoming');
  assert.equal(registrationStatus(valid,'2026-09-01'),'open');
  assert.equal(registrationStatus(valid,'2026-09-30'),'open');
  assert.equal(registrationStatus(valid,'2026-10-01'),'closed');
});
test('Pergantian hari dihitung dalam WIB, bukan UTC',()=>{
  assert.equal(todayJakarta(new Date('2026-09-30T16:59:59Z')),'2026-09-30');
  assert.equal(todayJakarta(new Date('2026-09-30T17:00:00Z')),'2026-10-01');
});
test('Tanggal kalender dan urutan tanggal divalidasi',()=>{
  assert.equal(validDate('2026-02-30'),false);
  assert.equal(validDate('2028-02-29'),true);
  assert.equal(validDate('2026-9-1'),false);
  assert.match(validateCompetition({...valid,endDate:'2026-08-01'},categories).errors.join(' '),/Tanggal akhir/);
});
test('Biaya gratis diterima; biaya kosong, negatif dan pecahan ditolak',()=>{
  assert.deepEqual(validateCompetition(valid,categories).errors,[]);
  for(const fee of ['',undefined,-1,1.5,Infinity,1000000001]) assert.match(validateCompetition({...valid,fee},categories).errors.join(' '),/Biaya/);
});
test('URL berbahaya, kategori tidak ada, dan path poster tidak sah ditolak',()=>{
  for(const registrationUrl of ['javascript:alert(1)','data:text/html,test','bad-link']) assert.match(validateCompetition({...valid,registrationUrl},categories).errors.join(' '),/URL/);
  assert.match(validateCompetition({...valid,categoryId:999},categories).errors.join(' '),/kategori/);
  assert.match(validateCompetition({...valid,poster:'/uploads/../../secret.png'},categories).errors.join(' '),/poster/);
});
