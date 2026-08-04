import React, { useEffect } from 'react';
import { useStore } from './store';
import { SVGVisualizer } from './components/SVGVisualizer';
import { SimulatorPanel } from './components/SimulatorPanel';
import { IncidentDashboard } from './components/IncidentDashboard';

function App() {
  const { initStream } = useStore();

  useEffect(() => {
    initStream();
  }, [initStream]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-950 font-sans">
      <SVGVisualizer />
      <SimulatorPanel />
      <IncidentDashboard />
    </div>
  );
}

export default App;
