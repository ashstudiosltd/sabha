import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';
const root=new URL('../',import.meta.url);
async function load(file,deps={}){const exports={};const source=await readFile(new URL(file,root),'utf8');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(name==='server-only')return {};assert.ok(name in deps,name);return deps[name];},Buffer,process:{env:{ANU_INTEGRATION_SECRET:'local-test-key-only'}},Date,TextEncoder,URL,console});return exports;}
const validation=await load('lib/projects/validation.ts',{'./types':{PROJECT_STAGES:['idea','prototype','building','launched','maintaining','paused','completed']}});
const context=await load('lib/anu/context.ts');
const actions=await load('lib/anu/actions.ts',{'node:crypto':crypto,'@/lib/projects/validation':validation,'./context':context});
const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',target='33333333-3333-4333-8333-333333333333';
const writes=[];let accessible=true,joined=true,version=1;
function query(table){const filters=[];let inserted;
 const q={select(){return q;},eq(key,value){filters.push([key,value]);return q;},insert(value){inserted=value;return q;},maybeSingle(){return Promise.resolve(resolve());},single(){return Promise.resolve(resolve());},then(done,fail){return Promise.resolve(resolve()).then(done,fail);}};
 function resolve(){if(inserted){writes.push({table,row:inserted});return {data:null,error:accessible?null:{code:'42501'}};}
 if(table==='clan_members')return {data:joined?{user_id:user}:null,error:null};
 if(!accessible)return {data:null,error:null};
 return {data:{id:target,title:'Selected post',name:'Private group',slug:'example',visibility:'private',version,archived_at:null},error:null};}
 return q;}
const db={from:query,rpc:async()=>({data:true,error:null})};
assert.ok(!context.searchWords('Show my private projects and clan members').includes('private'));
assert.ok(context.searchWords('Find older compiler notes').includes('compiler'));
assert.throws(()=>actions.parseActionDraft({kind:'delete_everything',body:'x'}),/Check/);
assert.throws(()=>actions.parseActionDraft({kind:'create_blog_comment',body:'x'.repeat(1001),targetId:target}),/1000/);
assert.throws(()=>actions.parseActionDraft({kind:'create_feed_comment',body:'x'}),/destination/);
const post=await actions.prepareAction(db,user,{kind:'create_feed_post',body:'My reviewed text'});
assert.equal(writes.length,0,'Draft preparation must not write');
assert.equal(actions.verifyActionToken(post.token,user).draft.body,'My reviewed text');
assert.throws(()=>actions.verifyActionToken(post.token,other),/another account/);
assert.throws(()=>actions.verifyActionToken(post.token.slice(0,-8)+'AAAAAAAA',user),/Invalid/);
const [payload]=post.token.split('.');const expired=JSON.parse(Buffer.from(payload,'base64url'));expired.expiresAt=1;const encoded=Buffer.from(JSON.stringify(expired)).toString('base64url');const expiredToken=encoded+'.'+crypto.createHmac('sha256','local-test-key-only').update(encoded).digest('base64url');assert.throws(()=>actions.verifyActionToken(expiredToken,user),/expired/);
assert.equal(actions.draftUsesAllowedSources({kind:'create_feed_comment',body:'x',targetId:target},[]),false);
assert.equal(actions.draftUsesAllowedSources({kind:'create_feed_comment',body:'x',targetId:target},[{kind:'blog',id:target}]),false);
assert.equal(actions.draftUsesAllowedSources({kind:'create_feed_comment',body:'x',targetId:target},[{kind:'feed',id:target}]),true);
await actions.executeAction(db,user,post.token);assert.equal(writes[0].row.author_id,user);assert.equal(writes[0].row.body,'My reviewed text');assert.equal(writes[0].table,'feed_posts');
const comment=await actions.prepareAction(db,user,{kind:'create_feed_comment',targetId:target,body:'Reviewed comment'});accessible=false;await assert.rejects(()=>actions.executeAction(db,user,comment.token),/no longer accessible/);assert.equal(writes.length,1);accessible=true;
const clan=await actions.prepareAction(db,user,{kind:'create_feed_post',clanId:target,body:'Clan-only text'});joined=false;await assert.rejects(()=>actions.executeAction(db,user,clan.token),/permission/);assert.equal(writes.length,1);joined=true;
const project={name:'Example',tagline:'',description:'Updated',technologies:[],visibility:'private',stage:'building'};
const edit=await actions.prepareAction(db,user,{kind:'update_project',targetId:target,body:'Updated',project});version=2;await assert.rejects(()=>actions.executeAction(db,user,edit.token),/changed/);
console.log('PASS: typed allowlist, bounds, source IDs, no draft writes, HMAC tampering/expiry/account binding, member-authored execution, revoked access/membership, and stale project versions.');

const reads=[];
const oldProject={id:target,slug:'compiler',name:'Compiler notes',description:'Older compiler project',updated_at:'2019-01-01',technologies:[],stage:'idea',visibility:'private',owner_id:user,version:1};
const reader={from(table){const filters=[];const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},or(v){reads.push({table,filter:v});return q;},order(){return q;},limit(){return q;},in(){return q;},maybeSingle(){return Promise.resolve({data:null,error:null});},then(done,fail){reads.push({table,filters});return Promise.resolve({data:table==='projects'?[oldProject]:[],error:null}).then(done,fail);}};return q;},rpc:async()=>({data:[],error:null})};
const retrieved=await context.retrieveContext(reader,user,'Find compiler notes');
assert.ok(retrieved.sources.some(source=>source.id===target),'Search must not discard an old matching record');
assert.ok(reads.some(read=>read.table==='projects'&&read.filter?.includes('ilike.%compiler%')));
assert.ok(reads.some(read=>read.table==='notifications'&&read.filters?.some(([key,value])=>key==='recipient_id'&&value===user)));
const inaccessible=await context.retrieveContext(reader,user,'Find compiler notes',{kind:'clan',id:other});assert.equal(inaccessible.focusUnavailable,true);assert.ok(!inaccessible.sources.some(source=>source.id===other));
console.log('PASS: old matching records, server-side lexical filtering, explicit notification ownership, and unavailable focus handling.');
