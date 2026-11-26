/* A single persisted wallet, reserved in the original futureFeatures slot.
   Rewards are identified by world + five-question stage, never by score. */
function starCoinWallet(){
 const c=state.futureFeatures.currency;
 if(c===null||c===undefined)state.futureFeatures.currency={version:1,balance:0,phaseRewards:{},transactions:[]};
 const wallet=state.futureFeatures.currency;
 wallet.phaseRewards ??= {};wallet.transactions ??= [];
 return wallet;
}
function starCoinStatus(){return {available:true,balance:starCoinWallet().balance}}
function reconcileStarCoins(mode='migration'){
 const wallet=starCoinWallet(),earned=[];
 for(const w of WORLDS){const questions=QUESTIONS[w.id];
  for(let phase=0;phase<Math.floor(questions.length/5);phase++){
   const id=w.id+':'+phase;
   if(Object.prototype.hasOwnProperty.call(wallet.phaseRewards,id))continue;
   if(!Array.from({length:5},(_,j)=>st(w.id).results[phase*5+j]).every(r=>r==='ok'||r==='miss'))continue;
   const reward={id,world:w.id,phase,amount:1,source:mode,at:mode==='gameplay'?new Date().toISOString():null};
   wallet.phaseRewards[id]=reward;wallet.transactions.push({...reward,type:'phase-reward'});wallet.balance+=1;earned.push(reward);
  }
 }
 if(earned.length)save();
 if(mode==='gameplay'&&earned.length)requestAnimationFrame(()=>celebrateStarCoins(earned));
 return earned.length;
}
function coinCounterMarkup(){return `<div class="world-coin-wallet" aria-label="Monedas estrella: ${starCoinStatus().balance}"><span class="scene-coin-symbol" aria-hidden="true"></span><span>Monedas estrella<strong>${starCoinStatus().balance}</strong></span></div>`}
function celebrateStarCoins(rewards){
 // Nonmodal and pointer transparent: answers and navigation remain usable.
 document.querySelectorAll('.coin-reward-notice').forEach(el=>el.remove());
 const notice=document.createElement('aside');notice.className='coin-reward-notice';notice.setAttribute('role','status');
 notice.innerHTML='<img src="assets/interfaz/moneda-estrella.svg" alt="" width="72" height="72"><strong>¡Has ganado 1 Moneda Estrella!</strong>';
 document.body.append(notice);
 const target=document.querySelector('.world-coin-wallet,.scene-wallet,.wardrobe-wallet,.medal-room-wallet');
 if(target){const from=notice.querySelector('img').getBoundingClientRect(),to=target.getBoundingClientRect();notice.style.setProperty('--coin-x',(to.x+to.width/2-from.x-from.width/2)+'px');notice.style.setProperty('--coin-y',(to.y+to.height/2-from.y-from.height/2)+'px')}
 setTimeout(()=>notice.remove(),2400);
}
