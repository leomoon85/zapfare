/* Deterministic checkout assistance. Never clicks a payment/booking submit button. */
(function(root){
  root.bestBookAssistCheckout=function(target){
    const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    const state=root.__bestBookCheckout||(root.__bestBookCheckout={});
    const text=document.body?.innerText||'';
    if(/captcha|access denied|too many requests|verify you are human/i.test(text.slice(0,2500)))return {status:'blocked',message:'This website needs your attention. BestBook will not bypass its access check.'};
    if(target.query&&target.operator&&target.departure){
      const total=text.match(/(?:total payable|amount payable|grand total)\s*[:：]?\s*₹\s*([\d,]+(?:\.\d{1,2})?)/i);
      const selected=text.match(/(?:selected seat(?:s)?|seat(?:s)? selected|seat no\.?)\s*[:：]?\s*([A-Z]{0,2}\d{1,3})\b/i);
      const dates=text.split('\n').map(PublicSources.isoDate).filter(Boolean);
      if(total&&selected&&dates.includes(target.query.date)&&text.toLowerCase().includes(target.operator.toLowerCase())&&text.includes(target.departure)){
        const amountMinor=Math.round(Number(total[1].replace(/,/g,''))*100);
        if(Number.isSafeInteger(amountMinor)&&amountMinor>0&&amountMinor<=10000000)return {status:'checkout-observed',message:'An exact-seat checkout total was read. Review all details and complete payment yourself.',checkout:{amountMinor,seat:selected[1].toUpperCase(),operator:target.operator,departure:target.departure}};
      }
    }
    if(target.query&&!state.contextConfirmed){
      const provider=location.hostname.includes('redbus')?'redbus':location.hostname.includes('ixigo')?'ixigo':'abhibus';
      const page=PublicSources.parse(PublicSources.snapshot(),target.query,provider);
      if(page.status!=='ready')return {status:'review',message:'Confirm the requested route and date on the website before any bus or seat assistance.'};
      state.contextConfirmed=true;
    }
    if(target.operator&&target.departure&&!state.busOpened){
      const cards=[...document.querySelectorAll('.bus-items > li,.bus-item,.service-card,[data-testid="bus-card"],[data-testid="service-card"]')].filter(visible);
      const matches=cards.filter(e=>e.innerText.toLowerCase().includes(target.operator.toLowerCase())&&e.innerText.includes(target.departure));
      if(matches.length===1){const button=[...matches[0].querySelectorAll('button,[role=button]')].find(e=>/^(view|select) seats?$/i.test(e.innerText.trim()));if(button){button.click();state.busOpened=true;return {status:'working',message:'Opened the matching bus. Check its route and departure.'};}}
    }
    if(target.seat&&!state.seatSelected){
      const seat=[...document.querySelectorAll('button,[role=button],[role=checkbox]')].filter(visible).filter(e=>{const label=e.getAttribute('data-seat')||e.getAttribute('aria-label')||e.innerText;return label?.trim()===target.seat&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';});
      if(seat.length===1&&state.busOpened){seat[0].click();state.seatSelected=seat[0].getAttribute('aria-pressed')==='true'||seat[0].getAttribute('aria-checked')==='true';return {status:'review',message:state.seatSelected?'Seat selection was confirmed by the page. Review the fare.':'Seat control was tapped; confirm the selection on the page.'};}
    }
    if(target.boardingPoint&&!state.boardingSelected){
      const option=[...document.querySelectorAll('label,[role=option]')].filter(visible).filter(e=>e.innerText.trim()===target.boardingPoint);
      if(option.length===1){option[0].click();state.boardingSelected=true;return {status:'review',message:'Boarding option chosen. Verify its location and time.'};}
    }
    if(target.coupon&&!state.couponFilled){
      const input=[...document.querySelectorAll('input')].filter(visible).find(e=>/coupon|promo/i.test([e.placeholder,e.getAttribute('aria-label'),e.name].join(' ')));
      if(input&&!input.readOnly){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,target.coupon);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));state.couponFilled=true;return {status:'review',message:'Coupon entered. Apply it and verify eligibility and the final total.'};}
    }
    if(/coupon.{0,30}(expired|invalid|not applicable|quota)|promo.{0,30}(expired|invalid)/i.test(text))return {status:'coupon-failed',message:'The website reports a coupon problem. It may depend on your eligibility; no global invalidation was made.'};
    return {status:'review',message:target.operator?'Confirm the bus, exact seat, stop and final amount here. If the page controls cannot be identified, choose them directly.':'Select your route and date here. BestBook does not submit passenger forms or payments.'};
  };
})(globalThis);
