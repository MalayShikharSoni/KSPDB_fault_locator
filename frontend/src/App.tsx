import { useEffect } from 'react';
import { Activity, CircleHelp, Radio } from 'lucide-react';
import { useStore } from './store';
import { SVGVisualizer } from './components/SVGVisualizer';
import { SimulatorPanel } from './components/SimulatorPanel';
import { IncidentDashboard } from './components/IncidentDashboard';
import styles from './App.module.css';

function App() {
  const { initStream, isConnected, gridState, activeIncidents } = useStore();
  const incidentCount = activeIncidents?.incidents.length ?? 0;

  useEffect(() => {
    const closeStream = initStream();
    return closeStream;
  }, [initStream]);

  return (
    <main className={styles.appContainer}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}><Activity size={19} strokeWidth={2.5} /></div>
          <div>
            <p className={styles.eyebrow}>KSPDB • GRID OPERATIONS</p>
            <h1>Fault Locator</h1>
          </div>
        </div>

        <div className={styles.headerMeta}>
          <div className={styles.liveStatus}>
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`} />
            <span>{isConnected ? 'Live stream connected' : 'Reconnecting to stream'}</span>
          </div>
          <div className={styles.divider} />
          <span className={styles.assetCount}>{gridState ? `${gridState.poles.length.toLocaleString()} assets monitored` : 'Loading grid'}</span>
          <button className={styles.helpButton} aria-label="Grid navigation help" title="Select a pole or transformer on the network to prefill the simulator.">
            <CircleHelp size={18} />
          </button>
        </div>
      </header>

      <section className={styles.workspace}>
        <aside className={styles.leftRail}>
          <SimulatorPanel />
        </aside>

        <section className={styles.networkArea} aria-label="Live electrical grid network">
          <div className={styles.canvasHeader}>
            <div>
              <p className={styles.panelLabel}>LIVE NETWORK</p>
              <h2>Distribution topology</h2>
            </div>
            <div className={styles.mapLegend} aria-label="Network legend">
              <span><i className={styles.legendLive} />Energized</span>
              <span><i className={styles.legendUnknown} />Unknown</span>
              <span><i className={styles.legendFault} />Fault</span>
              <span><b className={styles.transformerIcon} />Transformer</span>
            </div>
          </div>
          <SVGVisualizer />
          <div className={styles.canvasFooter}>
            <Radio size={15} />
            <span>{incidentCount ? `${incidentCount} active incident${incidentCount === 1 ? '' : 's'} detected` : 'No active incidents detected'}</span>
            <span className={styles.footerHint}>Select any asset to inspect or simulate</span>
          </div>
        </section>

        <aside className={styles.rightRail}>
          <IncidentDashboard />
        </aside>
      </section>
    </main>
  );
}

export default App;
