import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {validateSchema} from './schema.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const s=read('public/submission.json'),template=read('public/evidence/T01.json');
const schema=read('public/evidence/S01.json');
assert.deepEqual(validateSchema(s,schema),[],'Supplied JSON Schema validation');
const invalid=structuredClone(s);delete invalid.decisions.find(d=>d.reviewTier==='material_judgment').independentChallenge;
assert.ok(validateSchema(invalid,schema).some(e=>e.includes('independentChallenge')),'Material conditional required fields must be enforced');
assert.equal(s.schemaVersion,'1.0');assert.equal(s.caseId,'DPI-HT-01');
for(const k of ['student','evidence','decisions','schedules','statements','reconciliations','uncertainties','boardRecommendation'])assert.ok(s[k],k);
assert.equal(s.decisions.length,100);assert.equal(new Set(s.decisions.map(d=>d.id)).size,100);
const material=s.decisions.filter(d=>d.reviewTier==='material_judgment');assert.equal(material.length,25);
assert.equal(s.decisions.filter(d=>d.reviewTier==='operational').length,75);
const evidenceIds=new Set(s.evidence.map(e=>e.id));
for(let i=0;i<100;i++){
 const d=s.decisions[i],t=template.decisions[i];assert.equal(d.id,`D${String(i+1).padStart(3,'0')}`);assert.equal(d.question,t.question);assert.equal(d.reviewTier,t.reviewTier);
 assert.ok(typeof d.answer==='string'&&d.answer.length>20,d.id);assert.ok(d.evidence.length>0);assert.ok(d.evidence.every(e=>evidenceIds.has(e)));assert.ok(['low','medium','high'].includes(d.confidence));
 assert.ok(['pending','certified'].includes(d.certification.status));
 if(d.reviewTier==='material_judgment'){assert.ok(d.aiProposal.length>20);assert.ok(d.independentChallenge.length>=20);assert.ok(d.studentReasoning.length>=20);assert.equal(typeof d.changedFromAI,'boolean');assert.deepEqual(Object.keys(d.statementEffect).sort(),['assets','cash','equity','liabilities','profit']);for(const value of Object.values(d.statementEffect))assert.ok(value===null||typeof value==='number');}
 if(d.certification.status==='certified'){assert.ok(s.student.name.trim()&&s.student.id.trim());assert.ok(d.certification.certifiedBy&&d.certification.certifiedAt);if(d.reviewTier==='material_judgment')assert.ok(!d.studentReasoning.startsWith('Pending personal review.'));}
}
for(const e of s.evidence){const file='public'+e.url;assert.ok(fs.existsSync(file));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),e.sha256,'Original evidence changed: '+e.id);}
const p=s.statements.profitAndLoss,c=s.statements.cashFlow,b=s.statements.balanceSheet;
assert.equal(p.rows.filter(r=>!r.kind&&r.amount!==null).reduce((sum,r)=>sum+r.amount,0),p.netProfit);
const rawCash=c.rows.filter(r=>!r.kind).reduce((sum,r)=>sum+r.amount,0);assert.equal(rawCash,c.netChange);assert.equal(c.openingCash+c.netChange,c.closingCash);
assert.equal(c.operatingCashFlow+c.investingCashFlow+c.financingCashFlow,c.netChange);
assert.equal(b.totalAssets,b.totalLiabilities+b.equity);assert.equal(b.liabilitiesAndEquity,b.totalAssets);
assert.equal(s.schedules.revenueReceivables.rows.slice(0,-1).reduce((sum,r)=>sum+r[2],0),p.revenue);
assert.equal(s.schedules.revenueReceivables.rows.slice(0,-1).reduce((sum,r)=>sum+r[4]-r[5],0),168000);
assert.equal(80000+459000-405000-22000,112000);assert.equal(79000+42000-112000,9000);
assert.equal(15000+248000-231000,32000);assert.equal(180000+80000-(45000+24000),191000);
assert.equal(100000+50000-19000,131000);assert.equal(12000-10000,2000);
assert.equal(170000+p.netProfit-110000,b.equity);
const numericRecs=s.reconciliations.filter(r=>r.difference!==null);for(const r of numericRecs){assert.equal(r.left-r.right,r.difference);if(r.status!=='unresolved')assert.equal(r.difference,0,r.id);}
assert.equal(s.reconciliations.find(r=>r.id==='R05').difference,-9000);assert.equal(p.insuranceExpense,null);
assert.equal(s.decisions.filter(d=>d.agentConfidenceDifference).length,5);
const csv=fs.readFileSync('public/evidence/E02.csv','utf8').trim().split(/\r?\n/).slice(1);
const csvValues=line=>[...line.matchAll(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)].map(m=>m[1].replace(/^"|"$/g,'').replaceAll('""','"'));
let balance=0;for(const line of csv){const v=csvValues(line);balance+=Number(v[4]||0)-Number(v[3]||0);assert.equal(balance,Number(v[5]),'Bank running balance '+v[1]);}assert.equal(balance,c.closingCash);
assert.ok(fs.existsSync('public/review/index.html'));assert.ok(fs.existsSync('public/analysis/agent1.json'));assert.ok(fs.existsSync('public/analysis/agent2.json'));
assert.equal(fs.readFileSync('public/review/index.html','utf8').replaceAll('\r\n','\n'),fs.readFileSync('public/index.html','utf8').replaceAll('\r\n','\n').replace('<title>DPI | Financial reconstruction</title>','<title>DPI | Assessor review</title>'));
const config=read('vercel.json');assert.equal(config.outputDirectory,'dist');assert.ok(config.rewrites.some(r=>r.source==='/review'));
console.log('Verified: 100 original IDs, 75/25 split, evidence hashes, material review fields, cash, statements and schedules.');
console.log('Retained qualifications: inventory difference EUR9,000; unknown insurance; conditional opening balances.');
