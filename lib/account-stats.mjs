// Display only the server's reconciled counters. Missing observations are not zero.
export function holdingDuration(seconds){
 if(!Number.isSafeInteger(seconds)||seconds<0)return '—';
 const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600);
 return days?`${days.toLocaleString()}d ${hours}h`:hours?`${hours}h ${Math.floor(seconds%3600/60)}m`:seconds?'< 1 hour':'0 days';
}
export function statsDate(value,withTime=false){
 if(!value||Number.isNaN(Date.parse(value)))return '—';
 return new Date(value).toLocaleString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC',...(withTime?{hour:'numeric',minute:'2-digit',timeZoneName:'short'}:{})});
}
export function accountStatRows(stats,holding=stats?.holding){
 const count=n=>Number.isSafeInteger(n)&&n>=0?n.toLocaleString():'—';
 return [
  ['★','Member Since',statsDate(stats?.memberSince)],
  ['◴','Total Holding Time',holdingDuration(holding?.totalSeconds)],
  ['▥','Current Streak',holdingDuration(holding?.currentSeconds)],
  ['◆','Best GP Streak',holdingDuration(holding?.longestSeconds)],
  ['⚒','Skills Trained',stats?`${count(stats.skillsTrained)} / ${count(stats.skillsTotal)}`:'—'],
  ['♜','Equipment Collected',count(stats?.equipmentCollected)],
  ['♧','Services Completed',count(stats?.servicesCompleted)]
 ];
}
export function displayedHolding(stats,walletSnapshot){
 const holding=stats?.holding;
 if(walletSnapshot!==null&&walletSnapshot!==undefined&&(walletSnapshot.wallet?.address??null)!==(holding?.walletAddress??null)){
  return {status:walletSnapshot.wallet?'pending':'unverified'};
 }
 return holding;
}
