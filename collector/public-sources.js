/* Shared public-page reader. Runs on the user's device, in a provider WebView
 * or local browser process. It never calls a provider's private/API endpoints. */
(function(root){
  'use strict';
  const VERSION='public-dom-1';
  const normalize=s=>String(s||'').normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ').replace(/^bengaluru$/,'bangalore');
  const slug=s=>encodeURIComponent(normalize(s).replace(/\s+/g,'-'));
  const providers=[{id:'redbus',name:'redBus',host:'www.redbus.in'},{id:'ixigo',name:'ixigo',host:'www.ixigo.com'},{id:'abhibus',name:'AbhiBus',host:'www.abhibus.com'}];
  function validateQuery(q) {
    if(!q||typeof q.from!=='string'||typeof q.to!=='string'||!q.from.trim()||!q.to.trim()||q.from.length>80||q.to.length>80||normalize(q.from)===normalize(q.to))throw Error('Choose two different cities.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(q.date)||new Date(q.date+'T12:00:00Z').toISOString().slice(0,10)!==q.date)throw Error('Choose a valid travel date.');
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
    if(q.date<today)throw Error('Choose today or a future date.');
    return {from:q.from.trim(),to:q.to.trim(),date:q.date};
  }
  function url(id,q) {
    validateQuery(q);
    const [year,month,day]=q.date.split('-');
    const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+month-1];
    if(id==='redbus')return `https://www.redbus.in/bus-tickets/${slug(q.from)}-to-${slug(q.to)}?onward=${day}-${mon}-${year}`;
    if(id==='ixigo')return `https://www.ixigo.com/buses/${slug(q.from)}-${slug(q.to)}-sts`;
    if(id==='abhibus')return 'https://www.abhibus.com/';
    throw Error('Unsupported website');
  }
  function isoDate(text) {
    text=String(text||'').replace(/,/g,' ').replace(/\s+/g,' ').trim();
    let m=text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
    m=text.match(/\b(\d{1,2})[\s/-]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s/-]+(20\d{2})\b/i);
    if(m)return `${m[3]}-${String(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].slice(0,3).toLowerCase())+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return null;
  }
  // Executed in the remote page. Only public route/listing views are eligible.
  function snapshot() {
    const visible=e=>!!(e.getClientRects().length)&&getComputedStyle(e).visibility!=='hidden';
    const inputs=[...document.querySelectorAll('input')].filter(visible).filter(e=>/from|to|source|destination|journey|depart|date/i.test([e.placeholder,e.getAttribute('aria-label'),e.name,e.id].join(' '))).map(e=>({label:[e.placeholder,e.getAttribute('aria-label'),e.name,e.id].filter(Boolean).join(' '),value:e.value}));
    const selected=[...document.querySelectorAll('[aria-selected="true"],input[type=date],.date-display,.journey-date')].filter(visible).map(e=>e.value||e.getAttribute('aria-label')||e.innerText).slice(0,20);
    const bodyText=document.body?.innerText||'';
    const selectors=['.bus-items > li','.bus-item','.service-card','[data-testid="bus-card"]','[data-testid="service-card"]'];
    let cards=[];
    for(const selector of selectors){cards=[...document.querySelectorAll(selector)].filter(visible).map(e=>e.innerText).filter(t=>/\d{1,2}:\d{2}/.test(t)&&/₹|INR|Rs\.?/.test(t));if(cards.length)break;}
    return {url:location.href,title:document.title,text:bodyText.slice(0,300000),inputs,selected,cards:cards.slice(0,150)};
  }
  function routeConfirmed(s,q) {
    const inputs=s.inputs||[];
    const origin=inputs.find(x=>/leaving|from|source/i.test(x.label));
    const dest=inputs.find(x=>/going|destination|\bto\b/i.test(x.label));
    if(origin?.value&&dest?.value)return normalize(origin.value)===normalize(q.from)&&normalize(dest.value)===normalize(q.to);
    const text=normalize((s.text||'').slice(0,1800)+' '+s.title);
    const from=normalize(q.from),to=normalize(q.to);
    return [from+' to '+to,from+' - '+to,from+' → '+to].some(v=>text.includes(v));
  }
  function dateConfirmed(s,q) {
    const inputs=(s.inputs||[]).filter(x=>/date|journey|depart/i.test(x.label));
    const selectedDates=inputs.map(x=>isoDate(x.value)).filter(Boolean);
    // A dated results heading is stronger evidence than the form being edited.
    const line=(s.text||'').split('\n').find(x=>/buses?\s+available\s+on/i.test(x));
    if(line)return isoDate(line)===q.date;
    const headerDates=(s.text||'').slice(0,500).split('\n').map(isoDate).filter(Boolean);
    if(headerDates.length)return headerDates.includes(q.date);
    // An edited date input alone does not prove the displayed results refreshed.
    return false;
  }
  function parseCard(text) {
    const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);
    const typeIndex=lines.findIndex(x=>/sleeper|seater|semi.?sleeper|volvo|bharat.?benz/i.test(x)&&!/^\d/.test(x)&&x.length<130);
    if(typeIndex<1)return null;
    let operator=lines[typeIndex-1].replace(/\s*AD$/,'').trim();
    if(!operator||operator.length>120||/^from|^₹|^save|^view/i.test(operator))return null;
    const busType=lines[typeIndex];
    const timeMatches=[...text.matchAll(/\b([01]\d|2[0-3]):([0-5]\d)\b/g)].map(m=>m[0]);
    if(timeMatches.length<2)return null;
    let fare=text.match(/\bFrom\s*₹\s*([\d,]+(?:\.\d{1,2})?)/i);
    if(!fare)fare=text.match(/(?:₹|\bINR\b|\bRs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i);
    if(!fare)return null;
    const amountMinor=Math.round(Number(fare[1].replace(/,/g,''))*100);
    if(!Number.isSafeInteger(amountMinor)||amountMinor<=0||amountMinor>10000000)return null;
    const seats=text.match(/\b(\d{1,2})\s*(?:seats?\s*(?:available|left)?|berths?)/i);
    const offer=lines.filter(l=>/\bcode\s*[:：]|coupon|cashback|auto applied|offer/i.test(l)).slice(0,2).join(' · ').slice(0,240);
    return {operator,busType,departure:timeMatches[0],arrival:timeMatches[1],amountMinor,seat:'UNSELECTED',basis:'starting',...(seats?{availableSeats:Number(seats[1])}:{}),...(offer?{offerText:offer}:{}),evidenceText:lines.join('\n')};
  }
  function parse(s,q,provider) {
    validateQuery(q);
    const spec=providers.find(p=>p.id===provider);if(!spec)throw Error('Unsupported website');
    const u=new URL(s.url);
    if(u.protocol!=='https:'||u.hostname!==spec.host) return {status:'unsupported',message:'Website left the supported public search page.',rows:[]};
    if(/checkout|payment|passenger|login|account|booking-confirm/i.test(u.pathname))return {status:'unsupported',message:'Private checkout pages are not collected into the public cache.',rows:[]};
    if(/too many requests|access denied|verify you are human|captcha|unusual traffic|temporarily blocked/i.test((s.text||'').slice(0,5000)))return {status:'blocked',message:'Website requires direct access or has temporarily limited requests.',rows:[]};
    if(!routeConfirmed(s,q))return {status:'route-unconfirmed',message:'The requested route is not confirmed on the page.',rows:[]};
    if(!dateConfirmed(s,q))return {status:'date-unconfirmed',message:'The website has not confirmed your selected travel date.',rows:[]};
    let cards=s.cards||[];
    if(!cards.length){
      const lines=s.text.split('\n').map(x=>x.trim()).filter(Boolean);
      const starts=[];
      for(let i=1;i<lines.length;i++)if(/sleeper|seater|semi.?sleeper/i.test(lines[i])&&lines[i].length<130&&!/^\d|^AC Sleeper Seater/i.test(lines[i])&&/\d{2}:\d{2}/.test(lines.slice(i,i+35).join('\n')))starts.push(i-1);
      cards=starts.map((start,i)=>lines.slice(start,starts[i+1]||Math.min(lines.length,start+60)).join('\n'));
    }
    const seen=new Set();const now=Date.now();
    const rows=cards.map(parseCard).filter(Boolean).filter(row=>{const key=JSON.stringify([row.operator,row.busType,row.departure,row.amountMinor]);if(seen.has(key))return false;seen.add(key);return true;}).map(row=>({...row,from:q.from,to:q.to,date:q.date,provider:spec.name,currency:'INR',source:'public-page',observedAt:now,expiresAt:now+5*60000,sourceUrl:url(provider,q),collectorVersion:VERSION}));
    if(!rows.length)return {status:/no buses|no services|no results/i.test(s.text)?'empty':'unreadable',message:'No readable bus fares were found for the confirmed route and date.',rows:[]};
    return {status:'ready',message:`Read ${rows.length} advertised fares. Seat-specific fees and discounts still need checkout verification.`,rows};
  }
  root.PublicSources={VERSION,providers,validateQuery,url,isoDate,snapshot,parse,parseCard};
  if(typeof module!=='undefined')module.exports=root.PublicSources;
})(globalThis);
