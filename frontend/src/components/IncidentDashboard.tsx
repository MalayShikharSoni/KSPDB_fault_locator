import React from 'react';
import { ShieldAlert, Cpu } from 'lucide-react';
import { useStore } from '../store';

export function IncidentDashboard() {
  const { activeIncidents } = useStore();

  if (!activeIncidents) return null;

  const hasIncidents = activeIncidents.incidents.length > 0;
  const hasHardware = activeIncidents.hardwareIssues.length > 0;

  if (!hasIncidents && !hasHardware) {
    return (
      <div className="absolute top-4 right-4 w-80 bg-gray-900/90 backdrop-blur border border-green-900/50 rounded-xl p-4 shadow-2xl text-gray-200">
        <div className="flex items-center text-green-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
          <span className="font-medium text-sm">Grid Stable</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 w-80 max-h-[90vh] overflow-y-auto bg-gray-900/90 backdrop-blur border border-gray-800 rounded-xl shadow-2xl text-gray-200 hide-scrollbar">
      <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold text-lg flex items-center">
          <ShieldAlert className="w-5 h-5 text-red-500 mr-2" />
          Active Incidents
        </h2>
        <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">
          {activeIncidents.incidents.length}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {activeIncidents.incidents.map((incident, idx) => (
          <div key={incident.id || idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold bg-red-900/50 text-red-300 px-2 py-1 rounded">
                {incident.type.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-gray-400">
                Score: {(incident.confidenceScore * 100).toFixed(0)}%
              </span>
            </div>
            
            <div className="text-sm text-gray-300 mb-2 font-mono">
              Boundary: {incident.id}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-900 rounded p-2">
                <div className="text-gray-500 mb-1">Impact</div>
                <div className="font-bold text-gray-200">{incident.affectedPoles.length} poles</div>
              </div>
              <div className="bg-gray-900 rounded p-2">
                <div className="text-gray-500 mb-1">Topo Src</div>
                <div className="font-bold text-blue-400">
                  {incident.factors.topology === 1 ? 'Surveyed' : 'Inferred'}
                </div>
              </div>
            </div>
          </div>
        ))}

        {hasHardware && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-orange-400 flex items-center mb-3">
              <Cpu className="w-4 h-4 mr-1.5" />
              Hardware Issues
            </h3>
            {activeIncidents.hardwareIssues.map((hw, idx) => (
              <div key={idx} className="bg-orange-900/10 border border-orange-900/30 rounded p-2 mb-2 text-xs text-orange-300 font-mono">
                {hw.affectedPoles[0]?.id || 'Unknown'} - Broken Sensor
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
