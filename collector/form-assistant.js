/* Conservative form assistance using visible, semantic controls only. */
(function(root){
  root.advancePublicSearch=function(q){
    const state=root.__bestbookFormState||(root.__bestbookFormState={query:JSON.stringify(q),phase:'from',attempts:0});
    if(state.query!==JSON.stringify(q)){delete root.__bestbookFormState;return {status:'wait'};}
    if(++state.attempts>16)return {status:'interaction-required',message:'Select the route/date directly on the website.'};
    const snapshot=PublicSources.snapshot();
    if(/too many requests|access denied|captcha|verify you are human|unusual traffic/i.test(snapshot.text.slice(0,5000)))return {status:'blocked',message:'The website has limited automated access.'};
    const result=PublicSources.parse(snapshot,q,location.hostname.includes('redbus')?'redbus':location.hostname.includes('ixigo')?'ixigo':'abhibus');
    if(result.status==='ready'||result.status==='empty')return {status:'done',snapshot};
    const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    const inputs=[...document.querySelectorAll('input')].filter(visible);
    const label=e=>[e.placeholder,e.getAttribute('aria-label'),e.id,e.name].join(' ');
    const from=inputs.find(e=>/leaving|\bfrom\b|\bsource\b/i.test(label(e)));
    const to=inputs.find(e=>/going|\bto\b|destination/i.test(label(e)));
    const date=inputs.find(e=>/date|journey|depart/i.test(label(e)));
    const norm=s=>s.trim().toLowerCase().replace(/^bengaluru$/,'bangalore');
    function fill(input,value){if(!input||input.readOnly)return false;input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true;}
    for(const [name,input,value] of [['from',from,q.from],['to',to,q.to]]){
      if(input&&norm(input.value)!==norm(value)){
        if(state[name]!=='typed'){if(fill(input,value)){state[name]='typed';return {status:'wait'};}}
        const option=[...document.querySelectorAll('[role=option],li')].filter(visible).find(e=>{const t=norm(e.innerText);return t===norm(value)||t.startsWith(norm(value)+',')||t.startsWith(norm(value)+' (');});
        if(option){option.click();state[name]='selected';return {status:'wait'};}
        return {status:'wait'};
      }
      if(state[name]==='typed'){
        const option=[...document.querySelectorAll('[role=option],li')].filter(visible).find(e=>norm(e.innerText)===norm(value));
        if(option){option.click();state[name]='selected';return {status:'wait'};}
      }
    }
    if(date&&PublicSources.isoDate(date.value)!==q.date){
      if(date.type==='date'&&!date.readOnly){fill(date,q.date);state.dateSet=true;}
      else {
        if(!state.calendarOpened){date.click();state.calendarOpened=true;return {status:'wait'};}
        const dateObj=new Date(q.date+'T12:00:00');
        const candidates=[...document.querySelectorAll('button,[role=gridcell],td,[role=button]')].filter(visible);
        const target=candidates.find(e=>[e.getAttribute('aria-label'),e.getAttribute('data-date'),e.getAttribute('title')].some(t=>t&&PublicSources.isoDate(t)===q.date));
        if(target&&!target.disabled&&target.getAttribute('aria-disabled')!=='true'){target.click();state.dateSet=true;return {status:'wait'};}
        const dialog=document.querySelector('[role=dialog],.datepicker,.date-picker');
        if(dialog){const month=dateObj.toLocaleDateString('en-US',{month:'long',year:'numeric'});if(dialog.innerText.includes(month)){const cell=[...dialog.querySelectorAll('button,[role=gridcell],td')].filter(visible).find(e=>e.innerText.trim()===String(dateObj.getDate())&&!e.disabled&&e.getAttribute('aria-disabled')!=='true');if(cell){cell.click();state.dateSet=true;return {status:'wait'};}}}
        return {status:'interaction-required',message:'The website date control needs your selection.'};
      }
    }
    if(!state.submitted){
      const button=[...document.querySelectorAll('button,[role=button],input[type=submit]')].filter(visible).find(e=>/^search(?: buses)?$/i.test((e.innerText||e.value||'').trim()));
      if(button&&!button.disabled){button.click();state.submitted=true;return {status:'wait'};}
    }
    return {status:'wait',snapshot};
  };
})(globalThis);
