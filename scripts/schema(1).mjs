// Dependency-free validator for every keyword used in the supplied schema.
// Unsupported validation keywords fail explicitly rather than silently passing.
const supported=new Set(['$schema','title','description','type','required','properties','const','enum','pattern','items','minItems','maxItems','minLength','allOf','if','then','additionalProperties']);
export function validateSchema(value,schema,location='$'){
 const errors=[];const fail=message=>errors.push(`${location}: ${message}`);
 for(const key of Object.keys(schema))if(!supported.has(key))throw new Error('Unsupported schema keyword: '+key);
 if('const' in schema&&JSON.stringify(value)!==JSON.stringify(schema.const))fail('const mismatch');
 if(schema.enum&&!schema.enum.some(v=>JSON.stringify(v)===JSON.stringify(value)))fail('not in enum');
 const isType=t=>t==='null'?value===null:t==='array'?Array.isArray(value):t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):t==='number'?typeof value==='number'&&Number.isFinite(value):typeof value===t;
 if(schema.type&&!([schema.type].flat().some(isType)))fail('expected type '+schema.type);
 if(typeof value==='string'){
  if(schema.minLength!==undefined&&[...value].length<schema.minLength)fail('string too short');
  if(schema.pattern&&!new RegExp(schema.pattern).test(value))fail('pattern mismatch');
 }
 if(Array.isArray(value)){
  if(schema.minItems!==undefined&&value.length<schema.minItems)fail('too few items');
  if(schema.maxItems!==undefined&&value.length>schema.maxItems)fail('too many items');
  if(schema.items)value.forEach((v,i)=>errors.push(...validateSchema(v,schema.items,`${location}[${i}]`)));
 }
 if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
  for(const key of schema.required||[])if(!Object.hasOwn(value,key))fail('missing '+key);
  for(const [key,v] of Object.entries(value)){
   if(schema.properties&&Object.hasOwn(schema.properties,key))errors.push(...validateSchema(v,schema.properties[key],`${location}.${key}`));
   else if(schema.additionalProperties===false)fail('unexpected '+key);
  }
 }
 for(const rule of schema.allOf||[])errors.push(...validateSchema(value,rule,location));
 if(schema.if&&validateSchema(value,schema.if,location).length===0&&schema.then)errors.push(...validateSchema(value,schema.then,location));
 return errors;
}
