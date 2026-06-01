import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import styles from './Analytics.module.css';
import { calcTotal, formatCOP } from '../lib/storage';

function shortCOP(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1c1c17', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
      padding: '10px 14px', fontSize: 13
    }}>
      <div style={{ color: '#a09880', marginBottom: 6, fontSize: 11 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{formatCOP(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Analytics({ prestamos, isOpen, onClose }) {
  if (!isOpen) return null;

  const monthlyData = useMemo(() => {
    const map = {};
    prestamos.forEach(p => {
      if (!p.fechaPrestamo) return;
      const d = new Date(p.fechaPrestamo + 'T12:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { key, label: `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`, prestado: 0, cobrado: 0, count: 0 };
      map[key].prestado += p.monto;
      map[key].cobrado += p.estado === 'pagado' ? calcTotal(p.monto, p.interes) : 0;
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
  }, [prestamos]);

  const statusData = useMemo(() => {
    const counts = { activo: 0, vencido: 0, pagado: 0 };
    prestamos.forEach(p => { if (counts[p.estado] !== undefined) counts[p.estado]++; });
    return [
      { name: 'Activos', value: counts.activo, color: '#3ddc84' },
      { name: 'Vencidos', value: counts.vencido, color: '#e05555' },
      { name: 'Pagados', value: counts.pagado, color: '#6699cc' },
    ].filter(d => d.value > 0);
  }, [prestamos]);

  const topDeudores = useMemo(() => {
    const map = {};
    prestamos.filter(p => p.estado !== 'pagado').forEach(p => {
      if (!map[p.nombre]) map[p.nombre] = { nombre: p.nombre, total: 0, count: 0 };
      map[p.nombre].total += calcTotal(p.monto, p.interes);
      map[p.nombre].count++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [prestamos]);

  const totalPrestado = prestamos.reduce((a, p) => a + p.monto, 0);
  const totalRecuperado = prestamos.filter(p => p.estado === 'pagado').reduce((a, p) => a + calcTotal(p.monto, p.interes), 0);
  const tasaRecuperacion = totalPrestado > 0 ? (totalRecuperado / totalPrestado) * 100 : 0;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Estadísticas</div>
            <h2 className={styles.title}>Análisis de préstamos</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className={styles.body}>
          {/* KPIs */}
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Tasa de recuperación</div>
              <div className={styles.kpiVal} style={{ color: tasaRecuperacion > 60 ? 'var(--accent)' : 'var(--gold)' }}>
                {tasaRecuperacion.toFixed(1)}%
              </div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Total prestado</div>
              <div className={styles.kpiVal} style={{ color: 'var(--gold)' }}>{shortCOP(totalPrestado)}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Recuperado</div>
              <div className={styles.kpiVal} style={{ color: 'var(--blue)' }}>{shortCOP(totalRecuperado)}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Préstamos totales</div>
              <div className={styles.kpiVal}>{prestamos.length}</div>
            </div>
          </div>

          {/* Monthly area chart */}
          {monthlyData.length > 0 && (
            <div className={styles.chartSection}>
              <div className={styles.chartTitle}>Actividad mensual</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPrestado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCobrado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3ddc84" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3ddc84" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: '#5a5545', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={shortCOP} tick={{ fill: '#5a5545', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#a09880' }} />
                  <Area type="monotone" dataKey="prestado" name="Prestado" stroke="#c9a84c" fill="url(#gradPrestado)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="cobrado" name="Cobrado" stroke="#3ddc84" fill="url(#gradCobrado)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className={styles.row2}>
            {/* Status pie */}
            {statusData.length > 0 && (
              <div className={styles.chartSection}>
                <div className={styles.chartTitle}>Por estado</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                      dataKey="value" paddingAngle={3}>
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#1c1c17', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#a09880' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top deudores */}
            {topDeudores.length > 0 && (
              <div className={styles.chartSection}>
                <div className={styles.chartTitle}>Top deudores activos</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topDeudores} layout="vertical" margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tickFormatter={shortCOP} tick={{ fill: '#5a5545', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nombre" tick={{ fill: '#a09880', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Pendiente" fill="#c9a84c" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {prestamos.length === 0 && (
            <div className={styles.empty}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📊</div>
              <div style={{ color: 'var(--text3)', fontSize: 14 }}>Registra préstamos para ver estadísticas</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
