// Init Materialize components
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.sidenav');
  M.Sidenav.init(elems);
  const col = document.querySelectorAll('.collapsible');
  M.Collapsible.init(col);
});

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(err => console.log('SW registration failed', err));
  });
}



// ====== FitFuel Phase 2 features (localStorage, charts, favorites, notifications) ======
const store={get:(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
let workouts=store.get("workouts",[]),meals=store.get("meals",[]);
const uid=()=>Math.random().toString(36).slice(2,9);

function refreshLists(){
  const wList=document.getElementById("workout-list");
  if(wList)wList.innerHTML=workouts.map(w=>`<li class="collection-item"><span><b>${w.name}</b> — ${w.minutes} min <small class="grey-text">${w.date}</small></span><a href="#" class="secondary-content toggle-fav" data-type="workout" data-id="${w.id}" title="Favorite"><i class="material-icons ${w.favorite?'amber-text text-darken-2':''}">star</i></a></li>`).join("")||'<li class="collection-item">No workouts yet.</li>';
  const mList=document.getElementById("meal-list");
  if(mList)mList.innerHTML=meals.map(m=>`<li class="collection-item"><span><b>${m.name}</b> — ${m.calories} kcal, ${m.protein}g protein <small class="grey-text">${m.date}</small></span><a href="#" class="secondary-content toggle-fav" data-type="meal" data-id="${m.id}" title="Favorite"><i class="material-icons ${m.favorite?'amber-text text-darken-2':''}">star</i></a></li>`).join("")||'<li class="collection-item">No meals yet.</li>';
  const favs=document.getElementById("favorites");
  if(favs){const fW=workouts.filter(w=>w.favorite),fM=meals.filter(m=>m.favorite);favs.innerHTML=`<p><b>Favorite workouts</b>: ${fW.map(w=>w.name).join(", ")||'—'}</p><p><b>Favorite meals</b>: ${fM.map(m=>m.name).join(", ")||'—'}</p>`}
  updateDashboard(); renderCharts();
}

document.addEventListener("click",e=>{const a=e.target.closest(".toggle-fav");if(!a)return;e.preventDefault();const t=a.dataset.type,id=a.dataset.id;if(t==="workout"){const i=workouts.findIndex(w=>w.id===id);if(i>-1){workouts[i].favorite=!workouts[i].favorite;store.set("workouts",workouts)}}else{const i=meals.findIndex(m=>m.id===id);if(i>-1){meals[i].favorite=!meals[i].favorite;store.set("meals",meals)}}refreshLists()});

document.addEventListener("submit",e=>{const f=e.target;if(f.id==="form-workout"){e.preventDefault();const name=f.querySelector("[name=name]").value.trim();const minutes=Number(f.querySelector("[name=minutes]").value||0);const date=f.querySelector("[name=date]").value||new Date().toISOString().slice(0,10);if(!name)return;workouts.push({id:uid(),name,minutes,date,favorite:false});store.set("workouts",workouts);f.reset();M.updateTextFields();refreshLists();M.toast({html:"Workout added"})}if(f.id==="form-meal"){e.preventDefault();const name=f.querySelector("[name=name]").value.trim();const calories=Number(f.querySelector("[name=calories]").value||0);const protein=Number(f.querySelector("[name=protein]").value||0);const date=f.querySelector("[name=date]").value||new Date().toISOString().slice(0,10);if(!name)return;meals.push({id:uid(),name,calories,protein,date,favorite:false});store.set("meals",meals);f.reset();M.updateTextFields();refreshLists();M.toast({html:"Meal added"})}});

function updateDashboard(){const w7=sumLast7(workouts.map(w=>({date:w.date,value:1})));const m7=sumLast7(meals.map(m=>({date:m.date,value:1})));const c7=sumLast7(meals.map(m=>({date:m.date,value:m.calories||0})));const el=document.getElementById("dashboard-cards");if(!el)return;el.innerHTML=`<div class="col s12 m4"><div class="card teal lighten-1"><div class="card-content white-text"><span class="card-title">Workouts (7d)</span><h4>${w7}</h4></div></div></div><div class="col s12 m4"><div class="card indigo lighten-1"><div class="card-content white-text"><span class="card-title">Meals (7d)</span><h4>${m7}</h4></div></div></div><div class="col s12 m4"><div class="card deep-orange lighten-1"><div class="card-content white-text"><span class="card-title">Calories (7d)</span><h4>${c7}</h4></div></div></div>`}

function sumLast7(list){const today=new Date();const map=new Map();for(let i=0;i<7;i++){const d=new Date(today);d.setDate(today.getDate()-i);const key=d.toISOString().slice(0,10);map.set(key,0)}list.forEach(it=>{const key=(new Date(it.date)).toISOString().slice(0,10);if(map.has(key))map.set(key,map.get(key)+(it.value||0))});return Array.from(map.values()).reduce((a,b)=>a+b,0)}

let caloriesChart;function renderCharts(){const ctx=document.getElementById("calorie-chart");if(!ctx||!window.Chart)return;const today=new Date();const labels=[],data=[];for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);const key=d.toISOString().slice(0,10);labels.push(key.slice(5));const tot=meals.filter(m=>m.date===key).reduce((s,m)=>s+(m.calories||0),0);data.push(tot)}if(caloriesChart)caloriesChart.destroy();caloriesChart=new Chart(ctx,{type:"bar",data:{labels,datasets:[{label:"Calories per day (7d)",data}]},options:{responsive:true,maintainAspectRatio:false}})}

async function requestNotificationPermission(){if(!("Notification"in window))return;if(Notification.permission==="granted")return;try{await Notification.requestPermission()}catch{}}
function sendReminder(){if(!("Notification"in window))return;if(Notification.permission!=="granted")return;new Notification("Time to log your workout!",{body:"Open FitFuel and add today's session."})}
window.addEventListener("load",()=>{requestNotificationPermission();setTimeout(sendReminder,20000);refreshLists()});