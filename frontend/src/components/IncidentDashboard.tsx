import { ShieldAlert, Cpu } from 'lucide-react';
import { useStore } from '../store';
import styles from './IncidentDashboard.module.css';

export function IncidentDashboard() {
  const { activeIncidents } = useStore();

  if (!activeIncidents) return null;

  const hasIncidents = activeIncidents.incidents.length > 0;
  const hasHardware = activeIncidents.hardwareIssues.length > 0;

  if (!hasIncidents && !hasHardware) {
    return (
      <div className={styles.dashboardStable}>
        <div className={styles.stableMessage}>
          <div className={styles.stableDot} />
          <span className={styles.stableText}>Grid Stable</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.dashboard} hide-scrollbar`}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>
          <ShieldAlert className={styles.headerIcon} />
          Active Incidents
        </h2>
        <span className={styles.badgeCount}>
          {activeIncidents.incidents.length}
        </span>
      </div>

      <div className={styles.content}>
        {activeIncidents.incidents.map((incident, idx) => (
          <div key={incident.id || idx} className={styles.incidentCard}>
            <div className={styles.incidentHeader}>
              <span className={styles.incidentType}>
                {incident.type.toUpperCase()}
              </span>
              <span className={styles.incidentScore}>
                Score: {(incident.confidenceScore * 100).toFixed(0)}%
              </span>
            </div>
            
            <div className={styles.incidentBoundary}>
              Boundary: {incident.id}
            </div>

            <div className={styles.incidentGrid}>
              <div className={styles.gridItem}>
                <div className={styles.gridLabel}>Impact</div>
                <div className={styles.gridValue}>{incident.affectedPoles.length} poles</div>
              </div>
              <div className={styles.gridItem}>
                <div className={styles.gridLabel}>Topo Src</div>
                <div className={styles.gridValueBlue}>
                  {incident.factors.topology === 1 ? 'Surveyed' : 'Inferred'}
                </div>
              </div>
            </div>
          </div>
        ))}

        {hasHardware && (
          <div className={styles.hardwareSection}>
            <h3 className={styles.hardwareTitle}>
              <Cpu className={styles.hardwareIcon} />
              Hardware Issues
            </h3>
            {activeIncidents.hardwareIssues.map((hw, idx) => (
              <div key={idx} className={styles.hardwareItem}>
                {hw.affectedPoles[0]?.id || 'Unknown'} - Broken Sensor
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
