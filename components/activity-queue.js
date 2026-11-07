'use client';
import {formatActivityTime} from '../lib/activity-plan.mjs';
import './activity-queue.css';
export default function ActivityQueue({tasks,active,busy,onReorder,onRemove}){
 if(!active&&!tasks.length)return null;
 function move(index,offset){const ids=tasks.map(t=>t.id);[ids[index],ids[index+offset]]=[ids[index+offset],ids[index]];onReorder(ids);}
 let wait=0;
 return <section className="aq-queue" aria-label="Activity queue">
  <div className="aq-heading"><h3>Task Queue</h3><span>{tasks.length} waiting · {tasks.length+(active?1:0)}/20</span></div>
  {tasks.length?<ol>{tasks.map((task,index)=>{
    const after=wait;wait+=task.durationSeconds;
    return <li key={task.id} data-job-id={task.id}><span className="aq-position">{index+1}</span><div className="aq-description"><strong>{task.name}</strong><span>{task.quantity} {task.quantity===1?'batch':'batches'} · {formatActivityTime(task.durationSeconds)}</span><small>{index===0?'Next in line':`${formatActivityTime(after)} after the current task`}</small></div><div className="aq-controls"><button aria-label={`Move ${task.name} task ${index+1} up`} disabled={busy||index===0} onClick={()=>move(index,-1)}>↑</button><button aria-label={`Move ${task.name} task ${index+1} down`} disabled={busy||index===tasks.length-1} onClick={()=>move(index,1)}>↓</button><button className="aq-remove" aria-label={`Remove ${task.name} task ${index+1}`} disabled={busy} onClick={()=>onRemove(task.id)}>×</button></div></li>;
   })}</ol>:<p>No waiting tasks. Use a skill to add your next activity.</p>}
  <p className="aq-note">Resources reserved · Rewards saved automatically · Continues offline</p>
 </section>;
}
