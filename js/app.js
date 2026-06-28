const key = 'koreanStudyLogs.v1';
let logs = JSON.parse(localStorage.getItem(key) || '[]');
let materialChart, skillChart;
const $ = (id) => document.getElementById(id);
$('date').valueAsDate = new Date();

function save(){ localStorage.setItem(key, JSON.stringify(logs)); render(); }
function fmt(d){ return new Date(d).toISOString().slice(0,10); }
function monthStart(){ const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1); }
function weekStart(){ const d=new Date(); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d; }
function sum(arr){ return arr.reduce((a,b)=>a+Number(b.minutes||0),0); }
function groupBy(field){ return logs.reduce((acc,l)=>{acc[l[field]]=(acc[l[field]]||0)+Number(l.minutes); return acc;},{}); }
function understandingLabel(v){ return {5:'😊 完全理解',4:'🙂 だいたい理解',3:'😕 復習したい',2:'😭 まだ難しい',1:'🧊 無'}[v] || v; }

$('logForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  logs.unshift({ id: crypto.randomUUID(), date:$('date').value, minutes:+$('minutes').value, material:$('material').value, skill:$('skill').value, understanding:+$('understanding').value, review:$('review').checked, content:$('content').value.trim(), memo:$('memo').value.trim(), createdAt:new Date().toISOString() });
  e.target.reset(); $('date').valueAsDate = new Date(); save();
});

$('sampleBtn').addEventListener('click', ()=>{
  const today=new Date();
  const samples=[['Duolingo','単語',15,4,'Unit復習・例文音読'],['TOPIK文法','文法',35,3,'지만 / 그런데 / 아무래도'],['ドラマ','リスニング',40,4,'聞き取れた表現メモ'],['TOPIK単語','単語',25,3,'中級単語30個'],['ChatGPT','文化・表現',20,5,'SNS表現のニュアンス確認']];
  logs = samples.map((s,i)=>{const d=new Date(today); d.setDate(d.getDate()-i); return {id:crypto.randomUUID(),date:fmt(d),material:s[0],skill:s[1],minutes:s[2],understanding:s[3],content:s[4],memo:'',review:s[3]<=3,createdAt:new Date().toISOString()};}).concat(logs);
  save();
});

function renderChart(canvasId, oldChart, grouped, title){
  const labels=Object.keys(grouped); const data=Object.values(grouped);
  oldChart?.destroy();
  return new Chart($(canvasId), {type:'bar', data:{labels,datasets:[{label:title,data,borderWidth:1,borderRadius:10}]}, options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>v+'分'}}}}});
}

function calcStreak(){
  const dates = new Set(logs.map(l=>l.date)); let streak=0; const d=new Date();
  while(dates.has(fmt(d))){ streak++; d.setDate(d.getDate()-1); }
  return streak;
}

function render(){
  const now=new Date();
  $('monthTotal').textContent = sum(logs.filter(l=>new Date(l.date)>=monthStart())) + '分';
  $('weekTotal').textContent = sum(logs.filter(l=>new Date(l.date)>=weekStart())) + '分';
  $('streak').textContent = calcStreak() + '日';
  materialChart = renderChart('materialChart', materialChart, groupBy('material'), '学習時間');
  skillChart = renderChart('skillChart', skillChart, groupBy('skill'), '学習時間');

  const days=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(now.getDate()-i); days.push(d); }
  const maxDay=Math.max(1,...days.map(d=>sum(logs.filter(l=>l.date===fmt(d)))));
  $('calendar').innerHTML = days.map(d=>{ const total=sum(logs.filter(l=>l.date===fmt(d))); const isToday=fmt(d)===fmt(now); return `<div class="day ${isToday?'today':''}"><small>${d.getMonth()+1}/${d.getDate()}</small><strong>${total}分</strong><div class="bar"><i style="width:${Math.min(100,total/maxDay*100)}%"></i></div></div>`; }).join('');

  const reviews=logs.filter(l=>l.review || l.understanding<=3).slice(0,5);
  $('reviewList').className = 'list' + (reviews.length?'':' empty');
  $('reviewList').innerHTML = reviews.length ? reviews.map(logCard).join('') : 'まだありません';
  $('logList').className = 'list' + (logs.length?'':' empty');
  $('logList').innerHTML = logs.length ? logs.slice(0,20).map(logCard).join('') : 'まだ記録がありません';
}

function logCard(l){
  return `<article class="log"><div class="log-head"><span>${l.date} / ${l.minutes}分</span><button class="delete" onclick="delLog('${l.id}')">削除</button></div><div class="tags"><span class="tag">${l.material}</span><span class="tag">${l.skill}</span><span class="tag">${understandingLabel(l.understanding)}</span></div><div>${l.content || '内容なし'}</div>${l.memo?`<small>${l.memo}</small>`:''}</article>`;
}
function delLog(id){ logs=logs.filter(l=>l.id!==id); save(); }
render();
