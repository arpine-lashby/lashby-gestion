export const money = (value) => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(Number(value||0));
export const todayISO = () => new Date().toISOString().slice(0,10);
export const calculateSale = (lines, payments=[]) => {
  const subtotal=lines.reduce((sum,l)=>sum+(Number(l.unit_price)*Number(l.quantity)),0);
  const discounts=lines.reduce((sum,l)=>sum+Number(l.discount||0),0);
  const total=Math.max(0,subtotal-discounts);
  const paid=payments.reduce((sum,p)=>sum+Number(p.amount||0),0);
  return {subtotal,discounts,total,paid,difference:paid-total};
};
export const consumeFifo = (lots, quantity) => {
  let remaining=Number(quantity); const allocations=[];
  const ordered=[...lots].filter(l=>Number(l.remaining_quantity)>0).sort((a,b)=>new Date(a.received_at)-new Date(b.received_at));
  for(const lot of ordered){if(remaining<=0)break;const take=Math.min(remaining,Number(lot.remaining_quantity));allocations.push({lot_id:lot.id,quantity:take,unit_cost:lot.unit_cost,cost_pending:lot.unit_cost==null});remaining-=take;}
  if(remaining>0)allocations.push({lot_id:null,quantity:remaining,unit_cost:null,cost_pending:true});
  return allocations;
};
