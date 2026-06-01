import { useState } from 'react';
import styles from './PaymentsModal.module.css';
import { formatCOP, formatDate, calcTotal } from '../lib/storage';

export default function PaymentsModal({ isOpen, prestamo, onClose, onAddPago, onDeletePago }) {
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  if (!isOpen || !prestamo) return null;

  const total = calcTotal(prestamo.monto, prestamo.interes);
  const pagos = prestamo.pagos || [];
  const pagado = pagos.reduce((a, p) => a + p.monto, 0);
  const pendiente = total - pagado;
  const pct = Math.min(100, (pagado / total) * 100);

  function handleAdd() {
    const val = parseFloat(monto);
    if (!val || val <= 0) { setError('Ingresa un monto válido'); return; }
    if (val > pendiente + 0.01) { setError(`Máximo ${formatCOP(pendiente)}`); return; }
    onAddPago(prestamo.id, { monto: val, fecha, nota: nota.trim(), id: Date.now() });
    setMonto(''); setNota(''); setError('');
    setFecha(new Date().toISOString().split('T')[0]);
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Pagos parciales</div>
            <h2 className={styles.title}>{prestamo.nombre}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Progress */}
        <div className={styles.progressSection}>
          <div className={styles.progressRow}>
            <div className={styles.progressStat}>
              <span className={styles.progressLabel}>Pagado</span>
              <span className={styles.progressVal} style={{ color: 'var(--accent)' }}>{formatCOP(pagado)}</span>
            </div>
            <div className={styles.progressStat} style={{ textAlign: 'center' }}>
              <span className={styles.progressLabel}>Total</span>
              <span className={styles.progressVal}>{formatCOP(total)}</span>
            </div>
            <div className={styles.progressStat} style={{ textAlign: 'right' }}>
              <span className={styles.progressLabel}>Pendiente</span>
              <span className={styles.progressVal} style={{ color: pendiente <= 0 ? 'var(--accent)' : 'var(--gold)' }}>
                {pendiente <= 0 ? '¡Saldado!' : formatCOP(pendiente)}
              </span>
            </div>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.progressPct}>{pct.toFixed(1)}% cobrado</div>
        </div>

        {/* Add payment form */}
        {pendiente > 0.01 && (
          <div className={styles.addSection}>
            <div className={styles.addTitle}>Registrar abono</div>
            <div className={styles.addRow}>
              <div className={styles.field}>
                <label className={styles.label}>Monto</label>
                <input className={`${styles.input} ${error ? styles.inputError : ''}`}
                  type="number" value={monto} onChange={e => { setMonto(e.target.value); setError(''); }}
                  placeholder="0" min="0" />
                {error && <span className={styles.errorMsg}>{error}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Fecha</label>
                <input className={styles.input} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nota (opcional)</label>
              <input className={styles.input} value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: Transferencia Bancolombia" />
            </div>
            <div className={styles.quickBtns}>
              {[0.25, 0.5, 0.75, 1].map(f => (
                <button key={f} className={styles.quickBtn}
                  onClick={() => { setMonto(String(Math.round(pendiente * f))); setError(''); }}>
                  {f === 1 ? 'Todo' : `${f * 100}%`}
                </button>
              ))}
            </div>
            <button className={styles.btnAdd} onClick={handleAdd}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Registrar abono
            </button>
          </div>
        )}

        {/* History */}
        <div className={styles.history}>
          <div className={styles.historyTitle}>
            Historial de pagos
            <span className={styles.historyCount}>{pagos.length}</span>
          </div>
          {pagos.length === 0 ? (
            <div className={styles.historyEmpty}>Sin pagos registrados aún</div>
          ) : (
            <div className={styles.historyList}>
              {[...pagos].reverse().map(p => (
                <div key={p.id} className={styles.historyItem}>
                  <div className={styles.historyLeft}>
                    <div className={styles.historyMonto}>{formatCOP(p.monto)}</div>
                    {p.nota && <div className={styles.historyNota}>{p.nota}</div>}
                  </div>
                  <div className={styles.historyRight}>
                    <div className={styles.historyFecha}>{formatDate(p.fecha)}</div>
                    <button className={styles.historyDel} onClick={() => onDeletePago(prestamo.id, p.id)} title="Eliminar pago">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
