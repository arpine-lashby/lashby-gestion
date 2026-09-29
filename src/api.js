import { createClient } from '@supabase/supabase-js';

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured=Boolean(url&&key&&!url.includes('TU-PROYECTO'));
export const supabase=configured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}}):null;

export async function signIn(email,password){
  if(!configured) throw new Error('Falta conectar Supabase.');
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error)throw error; return data;
}
export async function signOut(){if(supabase)await supabase.auth.signOut();}
export async function session(){if(!supabase)return null;const {data}=await supabase.auth.getSession();return data.session;}
export async function loadAppData(){
  if(!supabase)return demoData;
  const [profile,products,sales,stock,expenses,cash,customers,appointments,courses,enrollments,audit]=await Promise.all([
    supabase.from('profiles').select('*').single(),
    supabase.from('products_with_stock').select('*').eq('active',true).order('name'),
    supabase.from('sales').select('*,sale_lines(*),sale_payments(*)').order('created_at',{ascending:false}).limit(50),
    supabase.from('stock_lots').select('*,products(name)').order('received_at',{ascending:false}),
    supabase.from('expenses').select('*').order('incurred_at',{ascending:false}).limit(50),
    supabase.from('cash_sessions').select('*').order('opened_at',{ascending:false}).limit(1),
    supabase.from('customers').select('*').order('full_name'),
    supabase.from('appointments').select('*,customers(full_name),products(name)').order('starts_at'),
    supabase.from('courses').select('*').order('starts_at',{ascending:false}),
    supabase.from('enrollments').select('*,customers(full_name),courses(name)').order('enrolled_at',{ascending:false}),
    supabase.from('audit_events').select('*,profiles(full_name)').order('occurred_at',{ascending:false}).limit(100)
  ]);
  for(const result of [profile,products,sales,stock,expenses,cash,customers,appointments,courses,enrollments,audit])if(result.error)throw result.error;
  return {profile:profile.data,products:products.data,sales:sales.data,stock:stock.data,expenses:expenses.data,cashSession:cash.data[0]||null,customers:customers.data,appointments:appointments.data,courses:courses.data,enrollments:enrollments.data,audit:audit.data,demo:false};
}
export async function createProduct(payload){const {data,error}=await supabase.from('products').insert(payload).select().single();if(error)throw error;return data;}
export async function createSale(payload){const {data,error}=await supabase.rpc('process_sale',{p_payload:payload});if(error)throw error;return data;}
export async function createStockReceipt(payload){const {data,error}=await supabase.rpc('receive_stock',{p_payload:payload});if(error)throw error;return data;}
export async function createExpense(payload){const {data,error}=await supabase.from('expenses').insert(payload).select().single();if(error)throw error;return data;}
export async function createCustomer(payload){const {data,error}=await supabase.from('customers').insert(payload).select().single();if(error)throw error;return data;}
export async function createAppointment(payload){const {data,error}=await supabase.from('appointments').insert(payload).select().single();if(error)throw error;return data;}
export async function createCourse(payload){const {data,error}=await supabase.from('courses').insert(payload).select().single();if(error)throw error;return data;}
export async function createEnrollment(payload){const {data,error}=await supabase.from('enrollments').insert(payload).select().single();if(error)throw error;return data;}
export async function openCash(openingCash,notes=null){const {data,error}=await supabase.rpc('open_cash',{p_opening_cash:openingCash,p_notes:notes});if(error)throw error;return data;}
export async function closeCash(countedCash,notes=null){const {data,error}=await supabase.rpc('close_cash',{p_counted_cash:countedCash,p_notes:notes});if(error)throw error;return data;}
export async function voidSale(saleId,reason){const {error}=await supabase.rpc('void_sale',{p_sale_id:saleId,p_reason:reason});if(error)throw error;}

export const demoData={
 demo:true,profile:{full_name:'Arpine Pahlevanyan',role:'ADMIN'},
 products:[],sales:[],stock:[],expenses:[],cashSession:null,customers:[],appointments:[],courses:[],enrollments:[],audit:[]
};
