// Real HTTP/JWT/Prisma/PostgreSQL; fictional provider verification only.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const connection = process.env.RAZORPAY_TEST_DATABASE_URL;
if (!connection || !['localhost','127.0.0.1'].includes(new URL(connection).hostname) || !new URL(connection).pathname.startsWith('/stock_schema_')) throw Error('Explicit disposable stock_schema_* localhost database required.');
process.env.DATABASE_URL=connection;
process.env.PG_SSL='false';
process.env.JWT_SECRET='razorpay-fictional-fixture-only';
process.env.RAZORPAY_CREDENTIALS_KEY=Buffer.alloc(32,9).toString('base64');
const { NestFactory }=require('@nestjs/core');
const { ValidationPipe, BadRequestException, ServiceUnavailableException }=require('@nestjs/common');
const { ConfigModule }=require('@nestjs/config');
const { PassportModule }=require('@nestjs/passport');
const { JwtModule,JwtService }=require('@nestjs/jwt');
const { DatabaseModule }=require('../dist/database/database.module');
const { PrismaService }=require('../dist/database/prisma.service');
const { AuthService }=require('../dist/auth/auth.service');
const { JwtStrategy }=require('../dist/auth/strategies/jwt.strategy');
const { RazorpayController }=require('../dist/razorpay/razorpay.controller');
const { RazorpayService }=require('../dist/razorpay/razorpay.service');
const { RazorpaySecrets }=require('../dist/razorpay/razorpay-secrets');
const { RazorpayProvider }=require('../dist/razorpay/razorpay-provider');
const { GlobalExceptionFilter }=require('../dist/common/filters/global-exception.filter');
const { TransformInterceptor }=require('../dist/common/interceptors/transform.interceptor');
const owner=`razorpay-${randomUUID()}`,other=`razorpay-other-${randomUUID()}`;
let app,prisma,base,token,otherToken,requests=0,checks=0;
const blocked=[];
let block=false;
const provider={verify:async credentials=>{
  checks++;
  if(credentials.keySecret==='rejected') throw new BadRequestException('Fictional provider rejected keys.');
  if(credentials.keySecret==='unavailable') throw new ServiceUnavailableException('Fictional provider unavailable.');
  if(block) await new Promise(resolve=>blocked.push(resolve));
}};
async function http(method,path,body,status=200,bearer=token){
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(bearer?{Authorization:`Bearer ${bearer}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const json=await response.json();requests++;
  assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(json)}`);
  return status<300?json.data:json;
}
const keys=(mode='test',keySecret='fictional-private-secret')=>({keyId:`rzp_${mode}_Fictional1234`,keySecret});
const row=mode=>prisma.razorpayConnection.findUnique({where:{userId_mode:{userId:owner,mode}}});
async function pauseStarted(){for(let i=0;i<100;i++){if(blocked.length)return;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('Fixture provider did not start');}
(async()=>{
  app=await NestFactory.create({module:class RazorpayFixture{},imports:[ConfigModule.forRoot({isGlobal:true,ignoreEnvFile:true}),DatabaseModule,PassportModule.register({defaultStrategy:'jwt'}),JwtModule.register({secret:process.env.JWT_SECRET})],controllers:[RazorpayController],providers:[RazorpayService,RazorpaySecrets,AuthService,JwtStrategy,{provide:RazorpayProvider,useValue:provider}]},{logger:false});
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}}));
  app.useGlobalFilters(new GlobalExceptionFilter());app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(0,'127.0.0.1');base=`${await app.getUrl()}/api/v1`;
  prisma=app.get(PrismaService);
  for(const id of [owner,other]) await prisma.user.create({data:{id,email:`${id}@example.test`,displayName:'Fictional merchant'}});
  token=app.get(JwtService).sign({sub:owner});otherToken=app.get(JwtService).sign({sub:other});
  const invoice=await prisma.invoice.create({data:{userId:owner,invoiceNumber:'UNCHANGED',serviceDate:new Date('2026-11-04'),dueDate:new Date('2026-12-04'),subtotal:100,taxRate:0,taxAmount:0,total:100,currency:'INR',status:'SENT'}});
  const before=await prisma.invoice.findUnique({where:{id:invoice.id}});
  await http('GET','/razorpay/connections',undefined,401,null);
  assert.deepEqual(await http('GET','/razorpay/connections'),{setupAvailable:true,connections:[]});
  await http('PUT','/razorpay/connections/test',keys(),400);
  await http('PUT','/razorpay/connections/LIVE',keys(),400);
  for(const fields of [{keySecret:123},{keySecret:null},{keySecret:''},{keySecret:' has spaces '},{keyId:false},{keyId:'wrong-prefix'},{extra:true}]) await http('PUT','/razorpay/connections/TEST',{...keys(),...fields},400);
  assert.equal(checks,0);
  const saved=await http('PUT','/razorpay/connections/TEST',keys());
  assert.equal(saved.maskedKeyId,'rzp_test_…1234');assert.equal(saved.enabled,true);
  const original=await row('TEST');
  assert.ok(!original.encryptedCredentials.includes(keys().keySecret));
  assert.deepEqual(JSON.parse(app.get(RazorpaySecrets).decrypt(owner,'TEST',original.encryptedCredentials)),keys());
  const serialized=JSON.stringify(await http('GET','/razorpay/connections'));
  assert.ok(!serialized.includes('encryptedCredentials')&&!serialized.includes(keys().keySecret)&&!serialized.includes(keys().keyId));
  assert.deepEqual((await http('GET','/razorpay/connections',undefined,200,otherToken)).connections,[]);
  await http('DELETE','/razorpay/connections/TEST',undefined,404,otherToken);
  await http('POST','/razorpay/connections/TEST/verify',{},404,otherToken);
  await http('PUT','/razorpay/connections/LIVE',keys('live'));
  assert.equal((await http('GET','/razorpay/connections')).connections.length,2);
  for(const secret of ['rejected','unavailable']){
    await http('PUT','/razorpay/connections/TEST',keys('test',secret),secret==='rejected'?400:503);
    assert.deepEqual(await row('TEST'),original);
  }
  await http('DELETE','/razorpay/connections/TEST');
  assert.equal((await row('TEST')).enabled,false);
  assert.equal((await row('LIVE')).enabled,true);
  await http('POST','/razorpay/connections/TEST/verify',{},201);
  assert.equal((await row('TEST')).enabled,true);
  // A provider check that started before disable must not re-enable it.
  block=true;
  const checking=http('POST','/razorpay/connections/TEST/verify',{},409);
  await pauseStarted();await http('DELETE','/razorpay/connections/TEST');
  blocked.shift()();await checking;block=false;
  assert.equal((await row('TEST')).enabled,false);
  // The same rule protects replacement of credentials while a check is pending.
  block=true;
  const replacing=http('PUT','/razorpay/connections/TEST',keys('test','new-private-secret'),409);
  await pauseStarted();await http('DELETE','/razorpay/connections/TEST');
  blocked.shift()();await replacing;block=false;
  assert.equal((await row('TEST')).encryptedCredentials,original.encryptedCredentials);
  assert.deepEqual(await prisma.invoice.findUnique({where:{id:invoice.id}}),before);
  assert.equal(await prisma.paymentEntry.count({where:{userId:owner}}),0);
  assert.equal(await prisma.stockAction.count({where:{userId:owner}}),0);
  await prisma.user.delete({where:{id:owner}});
  assert.equal(await prisma.razorpayConnection.count({where:{userId:owner}}),0);
  console.log(JSON.stringify({passed:true,httpRequests:requests,provider:'fictional read-only verifier',checks:['JWT/owner/mode isolation','strict raw validation','encrypted persistence and masked reads','failed replacement preservation','disable/re-enable','concurrent disable/check/replacement','unchanged invoices/payment/stock','account cascade']}));
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{block=false;for(const done of blocked)done();if(prisma){await prisma.user.deleteMany({where:{id:{in:[owner,other]}}});}if(app)await app.close();});
