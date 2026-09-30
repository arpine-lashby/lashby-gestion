export const money = (value) => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(Number(value||0));
export const businessDate = (value = new Date()) => {
  if(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) throw new Error('Fecha inválida');
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};
export const todayISO = () => businessDate();
export function argentinaTimestamp(localValue) {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue||''))throw new Error('Indicá fecha y hora válidas');
  const date=new Date(`${localValue}:00-03:00`);
  if(Number.isNaN(date.getTime())||businessDate(date)!==localValue.slice(0,10))throw new Error('Fecha inválida');
  return date.toISOString();
}
export const calculateSale = (lines, payments=[]) => {
  const cents=value=>Math.round((Number(value)+Number.EPSILON)*100);
  const subtotalCents=lines.reduce((sum,l)=>sum+cents(Number(l.unit_price)*Number(l.quantity)),0);
  const discountCents=lines.reduce((sum,l)=>sum+cents(l.discount||0),0);
  const totalCents=Math.max(0,subtotalCents-discountCents);
  const paidCents=payments.reduce((sum,p)=>sum+cents(p.amount||0),0);
  return {subtotal:subtotalCents/100,discounts:discountCents/100,total:totalCents/100,paid:paidCents/100,difference:(paidCents-totalCents)/100};
};
export const consumeFifo = (lots, quantity) => {
  let remaining=Number(quantity); const allocations=[];
  const ordered=[...lots].filter(l=>Number(l.remaining_quantity)>0).sort((a,b)=>new Date(a.received_at)-new Date(b.received_at));
  for(const lot of ordered){if(remaining<=0)break;const take=Math.min(remaining,Number(lot.remaining_quantity));allocations.push({lot_id:lot.id,quantity:take,unit_cost:lot.unit_cost,cost_pending:lot.unit_cost==null});remaining-=take;}
  if(remaining>0)allocations.push({lot_id:null,quantity:remaining,unit_cost:null,cost_pending:true});
  return allocations;
};

export function cashExpected(session, movements=[]) {
  if(!session)return 0;
  return Number(session.opening_cash || 0)+movements
    .filter(m=>m.cash_session_id===session.id&&m.status==='ACTIVE'&&m.method==='CASH')
    .reduce((sum,m)=>sum+(m.direction==='IN'?1:-1)*Number(m.amount),0);
}

export function periodSummary(data, period) {
  const within=value=>Boolean(value)&&businessDate(value).startsWith(period);
  const sales=data.sales.filter(s=>s.status!=='VOID'&&within(s.created_at));
  const expenses=data.expenses.filter(e=>e.status!=='VOID');
  const incurred=kind=>expenses.filter(e=>e.kind===kind&&within(e.incurred_at)).reduce((n,e)=>n+Number(e.amount),0);
  const paid=kind=>expenses.filter(e=>e.kind===kind&&e.status==='PAID'&&within(e.paid_at)).reduce((n,e)=>n+Number(e.amount),0);
  const lines=sales.flatMap(s=>s.sale_lines||[]);
  const pending=lines.some(l=>l.cost_status==='PENDING'||l.fifo_cost==null);
  const revenue=sales.reduce((n,s)=>n+Number(s.total),0);
  const commissions=sales.reduce((n,s)=>n+Number(s.commission_total||0),0);
  const cogs=pending?null:lines.reduce((n,l)=>n+Number(l.fifo_cost),0);
  const gross=cogs==null?null:revenue-cogs;
  const operatingExpenses=incurred('OPERATING');
  const operating=gross==null?null:gross-commissions-operatingExpenses;
  const loans=incurred('LOAN');
  // No sustituir una fecha de pago faltante por la fecha del gasto.
  const cashPending=expenses.some(e=>e.status==='PAID'&&!e.paid_at);
  const payments=data.sales.filter(s=>s.status!=='VOID').flatMap(s=>s.sale_payments||[])
    .filter(p=>within(p.created_at||p.paid_at));
  const collected=payments.reduce((n,p)=>n+Number(p.amount),0);
  const collectedCommissions=payments.reduce((n,p)=>n+Number(p.commission_amount||0),0);
  const flow=cashPending?null:collected-collectedCommissions-paid('PURCHASE')-paid('OPERATING');
  return {period,revenue,operations:sales.length,cogs,gross,commissions,purchases:paid('PURCHASE'),
    expenses:operatingExpenses,operating,loans,afterLoans:operating==null?null:operating-loans,
    flow,flowAfterLoans:flow==null?null:flow-paid('LOAN'),pending,cashPending};
}

// Reparte un descuento en centavos sin superar el importe de ninguna línea.
export function applyTotalDiscount(lines, amount=0) {
 const cents=v=>Math.round((Number(v)+Number.EPSILON)*100);
 const result=lines.map(l=>({...l}));
 const due=result.map(l=>{
  const gross=cents(Number(l.unit_price)*Number(l.quantity));const discount=cents(l.discount||0);
  if(!Number.isFinite(gross)||!Number.isFinite(discount)||discount<0||discount>gross)throw new Error('Descuento por producto inválido');
  return gross-discount;
 });
 const total=due.reduce((a,b)=>a+b,0);let remaining=cents(amount);
 if(!Number.isFinite(remaining)||remaining<0||remaining>total)throw new Error('El descuento supera el total');
 const shares=due.map(v=>total?Math.floor(remaining*v/total):0);
 remaining-=shares.reduce((a,b)=>a+b,0);
 for(let i=0;i<shares.length&&remaining;i++){const take=Math.min(remaining,due[i]-shares[i]);shares[i]+=take;remaining-=take;}
 result.forEach((l,i)=>l.discount=(cents(l.discount||0)+shares[i])/100);
 return result;
}
