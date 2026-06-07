export interface NarrativeReplayEvent { timestamp:number; from:string; to:string; strength:number }

export function buildReplay(events:NarrativeReplayEvent[]){ return events.sort((a,b)=>a.timestamp-b.timestamp) }