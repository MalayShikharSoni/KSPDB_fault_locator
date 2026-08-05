import { AlertTriangle, CheckCircle2, ChevronRight, Cpu, MapPin, ShieldAlert } from 'lucide-react';
import { useStore } from '../store';
import styles from './IncidentDashboard.module.css';

export function IncidentDashboard() {
  const { activeIncidents } = useStore();
  const incidents = activeIncidents?.incidents ?? [];
  const hardware = activeIncidents?.hardwareIssues ?? [];
  const isStable = incidents.length === 0 && hardware.length === 0;

  return <section className={styles.dashboard}>
    <div className={styles.heading}><div><p className={styles.overline}>RESPONSE QUEUE</p><h2>Network health</h2></div><span className={`${styles.count} ${isStable ? styles.countStable : ''}`}>{isStable ? 'Stable' : `${incidents.length} open`}</span></div>
    {isStable ? <div className={styles.stable}><div className={styles.check}><CheckCircle2 size={21}/></div><div><strong>Grid is operating normally</strong><p>No fault boundaries or sensor exceptions are currently reported.</p></div></div> : <>
      {incidents.length > 0 && <div className={styles.incidentList}>{incidents.map((incident, index) => { const confidence = Math.round(incident.confidenceScore * 100); return <article key={incident.id || index} className={styles.incidentCard}>
        <div className={styles.cardTop}><span className={styles.severity}><AlertTriangle size={13}/>{incident.type.replace('_', ' ')}</span><span className={styles.confidence}>{confidence}% confidence</span></div>
        <h3>Boundary identified</h3><p className={styles.boundary}>{incident.id}</p>
        <div className={styles.metrics}><div><span>IMPACT</span><strong>{incident.affectedPoles.length} <em>poles</em></strong></div><div><span>TOPOLOGY</span><strong>{incident.factors.topology === 1 ? 'Surveyed' : 'Inferred'}</strong></div></div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button className={styles.locationButton}><MapPin size={14}/>View area</button>
          <button onClick={() => {
            alert("Cannot resolve ticket: physical poles are still reporting dark. Auto-verification requires restoration telemetry.");
          }} style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14}/> Resolve
          </button>
        </div>
      </article> })}</div>}
      {hardware.length > 0 && <div className={styles.hardware}><div className={styles.hardwareTitle}><Cpu size={15}/><span>Sensor exceptions</span><b>{hardware.length}</b></div>{hardware.map((item,index) => <div className={styles.hardwareItem} key={item.poleId || index}><ShieldAlert size={14}/><span>{item.poleId || 'Unidentified asset'}</span><small>{item.reason || 'Broken sensor'}</small></div>)}</div>}
    </>}
  </section>;
}
