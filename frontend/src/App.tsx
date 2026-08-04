import React, { useEffect } from 'react';
import { useStore } from './store';
import { SVGVisualizer } from './components/SVGVisualizer';
import { SimulatorPanel } from './components/SimulatorPanel';
import { IncidentDashboard } from './components/IncidentDashboard';
import styles from './App.module.css';

function App() {
  const { initStream } = useStore();

  useEffect(() => {
    initStream();
  }, [initStream]);

  return (
    <div className={styles.appContainer}>
      <SVGVisualizer />
      <SimulatorPanel />
      <IncidentDashboard />
    </div>
  );
}

export default App;
