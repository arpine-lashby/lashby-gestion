import { createClient } from '@supabase/supabase-js';
import {currentCashSession} from './core.js';

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const redirectParams=new URLSearchParams(window.location.hash.slice(1));
export const recoveryRequested=redirectParams.get('type')==='recovery';
export const authRedirectError=redirectParams.has('error')||redirectParams.has('error_code');
export const configured=Boolean(url&&key&&!url.includes('TU-PROYECTO'));
export const supabase=configured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}}):null;

export async function signIn(email,password){
  if(!configured) throw new Error('Falta conectar Supabase.');
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error)throw error; return data;
}
export async function signOut(){if(supabase)await supabase.auth.signOut();}
export async function requestPasswordReset(email){
  if(!supabase)throw new Error('Falta conectar Supabase.');
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/'});
  if(error)throw error;
}
export async function updatePassword(password){
  if(!supabase)throw new Error('Falta conectar Supabase.');
  const {error}=await supabase.auth.updateUser({password});
  if(error)throw error;
}
export async function session(){if(!supabase)return null;const {data}=await supabase.auth.getSession();return data.session;}
// Supabase limita las respuestas: recorrer todas las páginas para no truncar informes.
async function allRows(table, selection='*', order='id') {
  const rows=[];
  for(let offset=0;;offset+=500){
    let query=supabase.from(table).select(selection).order(order);
    if(order!=='id')query=query.order('id');
    const result=await query.range(offset,offset+499);
    if(result.error)return {data:null,error:result.error};
    rows.push(...result.data);
    if(result.data.length<500)return {data:rows,error:null};
  }
}
export async function loadAppData(){
  if(!supabase)return demoData;
  const {data:authData,error:authError}=await supabase.auth.getUser();
  if(authError)throw authError;
  if(!authData.user)throw new Error('Iniciá sesión para continuar.');
  const profile=await supabase.from('profiles').select('*').eq('id',authData.user.id).single();
  if(profile.error)throw new Error('Tu usuario todavía no tiene un perfil de Lashby. Debe configurarlo un administrador.');
  if(!profile.data.active)throw new Error('Tu usuario está inactivo.');
  const isAdmin=profile.data.role==='ADMIN';
  const empty=Promise.resolve({data:[],error:null});
  const [products,sales,stock,expenses,cash,customers,appointments,courses,enrollments,audit,cashMovements,variants,receipts]=await Promise.all([
    allRows('products_with_stock','*','name'),
    supabase.rpc('read_sales_safe'),
    isAdmin?allRows('stock_lots','*,products(name)'):empty,
    isAdmin?allRows('expenses'):empty,
    supabase.from('cash_sessions').select('*').order('opened_at',{ascending:false}).limit(1),
    allRows('customers','*','full_name'),
    allRows('appointments','*,customers(full_name),products(name)','starts_at'),
    allRows('courses','*','starts_at'),
    allRows('enrollments','*,customers(full_name),courses(name)','enrolled_at'),
    isAdmin?supabase.from('audit_events').select('*,profiles(full_name)').order('id',{ascending:false}).limit(101):empty,
    allRows('cash_movements'),
    allRows('product_variants'),
    isAdmin?allRows('stock_receipts'):empty
  ]);
  for(const result of [profile,products,sales,stock,expenses,cash,customers,appointments,courses,enrollments,audit,cashMovements,variants,receipts])if(result.error)throw result.error;
  const extra={};for(const table of ['promotions','product_units','service_collections','student_installments','student_payments','attendance','certificates','appointment_reminders','kit_components','kit_assemblies','customer_credit_transactions']){const r=await allRows(table);if(r.error)throw r.error;extra[table]=r.data}if(isAdmin){const r=await allRows('suppliers');if(r.error)throw r.error;extra.suppliers=r.data}else extra.suppliers=[];const settings=await supabase.rpc('read_payment_settings');if(settings.error)throw settings.error;extra.paymentSettings=settings.data;const returns=await supabase.rpc('read_returns_safe');if(returns.error)throw returns.error;extra.returns=returns.data;if(isAdmin){const a=await allRows('sale_cost_allocations');if(a.error)throw a.error;extra.fifoAllocations=a.data}
  const lastCashSession=cash.data[0]||null;
  const cashSession=currentCashSession(lastCashSession);
  if(cashSession){const r=await supabase.rpc('read_cash_expected',{p_session_id:cashSession.id});if(r.error)throw r.error;extra.cashExpected=Number(r.data);}
  return {...extra,profile:profile.data,products:products.data,sales:sales.data,stock:stock.data,expenses:expenses.data,cashSession,lastCashSession,customers:customers.data,appointments:appointments.data,courses:courses.data,enrollments:enrollments.data,audit:audit.data.slice(0,100),auditHasMore:audit.data.length>100,cashMovements:cashMovements.data,variants:variants.data,receipts:receipts.data,demo:false};
}

export async function loadAuditPage(beforeId=null){
 let q=supabase.from('audit_events').select('*,profiles(full_name)').order('id',{ascending:false}).limit(101);
 if(beforeId!=null)q=q.lt('id',beforeId);
 const {data,error}=await q;if(error)throw error;
 return {rows:data.slice(0,100),hasMore:data.length>100};
}
export async function createProduct(payload){const {data,error}=await supabase.from('products').insert(payload).select().single();if(error)throw error;return data;}
export async function createSale(payload){const {data,error}=await supabase.rpc('process_sale',{p_payload:payload});if(error)throw error;return data;}
export async function createStockReceipt(payload){const {data,error}=await supabase.rpc('receive_stock',{p_payload:payload});if(error)throw error;return data;}
export async function createExpense(payload){const {data,error}=await supabase.rpc('create_expense',{p_payload:payload});if(error)throw error;return data;}
export async function createCustomer(payload){const {data,error}=await supabase.from('customers').insert(payload).select().single();if(error)throw error;return data;}
export async function createAppointment(payload){const {data,error}=await supabase.from('appointments').insert(payload).select().single();if(error)throw error;return data;}
export async function createCourse(payload){const {data,error}=await supabase.from('courses').insert(payload).select().single();if(error)throw error;return data;}
export async function createEnrollment(payload){const {data,error}=await supabase.from('enrollments').insert(payload).select().single();if(error)throw error;return data;}
export async function openCash(openingCash,notes=null){const {data,error}=await supabase.rpc('open_cash',{p_opening_cash:openingCash,p_notes:notes});if(error)throw error;return data;}
export async function closeCash(countedCash,notes=null){const {data,error}=await supabase.rpc('close_cash',{p_counted_cash:countedCash,p_notes:notes});if(error)throw error;return data;}
export async function voidSale(saleId,reason){const {error}=await supabase.rpc('void_sale',{p_sale_id:saleId,p_reason:reason});if(error)throw error;}

export const demoData={
 demo:true,profile:{full_name:'Arpine Pahlevanyan',role:'ADMIN'},
 products:[],sales:[],stock:[],expenses:[],cashSession:null,customers:[],appointments:[],courses:[],enrollments:[],audit:[],cashMovements:[],variants:[],receipts:[]
};

export async function payExpense(id,method,paidAt){const {error}=await supabase.rpc('pay_expense',{p_expense_id:id,p_method:method,p_paid_at:paidAt});if(error)throw error;}
export async function voidExpense(id,reason){const {error}=await supabase.rpc('void_expense',{p_expense_id:id,p_reason:reason});if(error)throw error;}
export async function completeLotCost(id,total){const {error}=await supabase.rpc('complete_lot_cost',{p_lot_id:id,p_total_cost:total});if(error)throw error;}

export async function createVariant(payload){const {data,error}=await supabase.from('product_variants').insert(payload).select().single();if(error)throw error;return data;}

export async function voidStockReceipt(id,reason){const {error}=await supabase.rpc('void_stock_receipt',{p_receipt_id:id,p_reason:reason});if(error)throw error;}

export async function callOperation(name,args){const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data;}
export async function saveRecord(table,payload,id=null){const query=id?supabase.from(table).update(payload).eq('id',id):supabase.from(table).insert(payload);const {data,error}=await query.select().single();if(error)throw error;return data;}
export async function setAttendance(payload){const {error}=await supabase.from('attendance').upsert(payload,{onConflict:'enrollment_id,class_date'});if(error)throw error;}
