import React, { useState } from 'react';
import axios from 'axios';
import { Activity, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store';
import styles from './SimulatorPanel.module.css';

export function SimulatorPanel() {
  const [type, setType] = useState<'span' | 'dt' | 'feeder'>('span');
  const [targetId, setTargetId] = useState('');
  const [dtId, setDtId] = useState('');
  const [activeFaultId, setActiveFaultId] = useState<string | null>(null);
  
  const { isConnected, selectedTargetId, selectedContextDtId } = useStore();

  React.useEffect(() => {
    if (selectedTargetId) setTargetId(selectedTargetId);
  }, [selectedTargetId]);

  React.useEffect(() => {
    if (selectedContextDtId) setDtId(selectedContextDtId);
  }, [selectedContextDtId]);

  const handleInject = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await axios.post(`${API_URL}/api/simulate/fault`, {
        type,
        targetId,
        ...(type === 'span' && { dtId })
      });
      setActiveFaultId(res.data.faultId);
    } catch (e) {
      console.error(e);
      alert('Failed to inject fault');
    }
  };

  const handleRepair = async () => {
    if (!activeFaultId) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      await axios.post(`${API_URL}/api/simulate/repair`, { faultId: activeFaultId });
      setActiveFaultId(null);
    } catch (e) {
      console.error(e);
      alert('Failed to repair fault');
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Activity className={isConnected ? styles.headerIconLive : styles.headerIconOffline} />
        <h2 className={styles.headerTitle}>Simulator Control</h2>
      </div>

      <div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Fault Type</label>
          <select 
            value={type} 
            onChange={e => setType(e.target.value as 'span' | 'dt' | 'feeder')}
            className={styles.input}
          >
            <option value="span">Span (Edge)</option>
            <option value="dt">Distribution Transformer</option>
            <option value="feeder">Feeder</option>
          </select>
        </div>

        {type === 'span' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>DT ID (Context)</label>
            <input 
              value={dtId}
              onChange={e => setDtId(e.target.value)}
              placeholder="e.g. D-0001"
              className={styles.input}
            />
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>Target ID</label>
          <input 
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            placeholder={type === 'span' ? 'e.g. P-0010 (Child Pole)' : 'e.g. D-0001'}
            className={styles.input}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button onClick={handleInject} className={`${styles.btn} ${styles.btnInject}`}>
            <Zap className={styles.btnIcon} /> Inject
          </button>
          
          <button 
            onClick={handleRepair}
            disabled={!activeFaultId}
            className={`${styles.btn} ${activeFaultId ? styles.btnRepair : styles.btnRepairDisabled}`}
          >
            <CheckCircle2 className={styles.btnIcon} /> Repair
          </button>
        </div>

        {activeFaultId && (
          <div className={styles.activeFaultAlert}>
            <AlertTriangle className={styles.alertIcon} />
            Active Fault: {activeFaultId.slice(0,18)}...
          </div>
        )}
      </div>
    </div>
  );
}
