import React, { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Check, ChevronDown, CircleDotDashed, Play, Wrench } from 'lucide-react';
import { useStore } from '../store';
import styles from './SimulatorPanel.module.css';

export function SimulatorPanel() {
  const [type, setType] = useState<'span' | 'dt' | 'feeder'>('span');
  const [targetId, setTargetId] = useState('');
  const [dtId, setDtId] = useState('');
  const [activeFaultId, setActiveFaultId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { isConnected, selectedTargetId, selectedContextDtId } = useStore();

  React.useEffect(() => { if (selectedTargetId) setTargetId(selectedTargetId); }, [selectedTargetId]);
  React.useEffect(() => { if (selectedContextDtId) setDtId(selectedContextDtId); }, [selectedContextDtId]);

  const handleInject = async () => {
    if (!targetId || (type === 'span' && !dtId)) { setMessage('Select a network asset first, then run the simulation.'); return; }
    setIsSubmitting(true); setMessage(null);
    try { const API_URL = import.meta.env.VITE_API_URL || ''; const res = await axios.post(`${API_URL}/api/simulate/fault`, { type, targetId, ...(type === 'span' && { dtId }) }); setActiveFaultId(res.data.faultId); setMessage('Fault simulation is now running.'); }
    catch { setMessage('The simulation could not be started. Please try again.'); }
    finally { setIsSubmitting(false); }
  };
  const handleRepair = async () => {
    if (!activeFaultId) return; setIsSubmitting(true); setMessage(null);
    try { const API_URL = import.meta.env.VITE_API_URL || ''; await axios.post(`${API_URL}/api/simulate/repair`, { faultId: activeFaultId }); setActiveFaultId(null); setMessage('Repair signal sent to the network.'); }
    catch { setMessage('The repair signal could not be sent.'); }
    finally { setIsSubmitting(false); }
  };
  const selectedText = targetId ? `Target: ${targetId}` : 'Select a pole or transformer on the map';
  return <section className={styles.panel}>
    <div className={styles.panelHeading}><div><p className={styles.overline}>SIMULATION LAB</p><h2>Fault controls</h2></div><span className={`${styles.connection} ${isConnected ? styles.online : ''}`}><CircleDotDashed size={14}/>{isConnected ? 'Online' : 'Offline'}</span></div>
    <div className={styles.notice}><AlertTriangle size={15}/><span>Use simulations to validate response workflows. Changes stream live.</span></div>
    <div className={styles.formGroup}><label htmlFor="fault-type">Scenario type</label><div className={styles.selectWrap}><select id="fault-type" value={type} onChange={e => setType(e.target.value as typeof type)}><option value="span">Span interruption</option><option value="dt">Transformer outage</option><option value="feeder">Feeder outage</option></select><ChevronDown size={15}/></div></div>
    {type === 'span' && <div className={styles.formGroup}><label htmlFor="dt-id">Transformer context</label><input id="dt-id" value={dtId} onChange={e => setDtId(e.target.value)} placeholder="e.g. D-0001" /></div>}
    <div className={styles.formGroup}><label htmlFor="target-id">Target asset</label><input id="target-id" value={targetId} onChange={e => setTargetId(e.target.value)} placeholder={type === 'span' ? 'e.g. P-0010' : 'e.g. D-0001'} /><small>{selectedText}</small></div>
    <div className={styles.actions}><button onClick={handleInject} disabled={isSubmitting} className={styles.inject}><Play size={15} fill="currentColor"/>{isSubmitting ? 'Working…' : 'Run simulation'}</button><button onClick={handleRepair} disabled={!activeFaultId || isSubmitting} className={styles.repair}><Wrench size={15}/>Repair</button></div>
    {(activeFaultId || message) && <div className={`${styles.feedback} ${activeFaultId ? styles.active : ''}`}>{activeFaultId ? <AlertTriangle size={15}/> : <Check size={15}/>}<span>{message || `Active test: ${activeFaultId?.slice(0, 18)}…`}</span></div>}
  </section>;
}
