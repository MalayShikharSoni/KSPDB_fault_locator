import React, { useState } from 'react';
import axios from 'axios';
import { Activity, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store';

export function SimulatorPanel() {
  const [type, setType] = useState<'span' | 'dt' | 'feeder'>('span');
  const [targetId, setTargetId] = useState('');
  const [dtId, setDtId] = useState('');
  const [activeFaultId, setActiveFaultId] = useState<string | null>(null);
  
  const { isConnected } = useStore();

  const handleInject = async () => {
    try {
      const res = await axios.post('/api/simulate/fault', {
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
      await axios.post('/api/simulate/repair', { faultId: activeFaultId });
      setActiveFaultId(null);
    } catch (e) {
      console.error(e);
      alert('Failed to repair fault');
    }
  };

  return (
    <div className="absolute top-4 left-4 w-80 bg-gray-900/90 backdrop-blur border border-gray-800 rounded-xl p-4 shadow-2xl text-gray-200">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className={`w-5 h-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
        <h2 className="font-semibold text-lg">Simulator Control</h2>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 font-medium">Fault Type</label>
          <select 
            value={type} 
            onChange={e => setType(e.target.value as any)}
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="span">Span (Edge)</option>
            <option value="dt">Distribution Transformer</option>
            <option value="feeder">Feeder</option>
          </select>
        </div>

        {type === 'span' && (
          <div>
            <label className="text-xs text-gray-400 font-medium">DT ID (Context)</label>
            <input 
              value={dtId}
              onChange={e => setDtId(e.target.value)}
              placeholder="e.g. D-0001"
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label className="text-xs text-gray-400 font-medium">Target ID</label>
          <input 
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            placeholder={type === 'span' ? 'e.g. P-0010 (Child Pole)' : 'e.g. D-0001'}
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex space-x-2 pt-2">
          <button 
            onClick={handleInject}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center"
          >
            <Zap className="w-4 h-4 mr-1" /> Inject
          </button>
          
          <button 
            onClick={handleRepair}
            disabled={!activeFaultId}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center ${activeFaultId ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Repair
          </button>
        </div>

        {activeFaultId && (
          <div className="mt-2 p-2 bg-red-900/30 border border-red-900/50 rounded-lg text-xs flex items-center text-red-200">
            <AlertTriangle className="w-3 h-3 mr-1.5 flex-shrink-0" />
            Active Fault: {activeFaultId.slice(0,18)}...
          </div>
        )}
      </div>
    </div>
  );
}
