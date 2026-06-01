import { useState } from 'react';
import styles from './LoanCard.module.css';
import { formatCOP, formatDate, diasRestantes, calcTotal } from '../lib/storage';

export default function LoanCard({ prestamo, onEdit, onDelete, onTogglePago, onPagos }) {
  const [expanded, setExpanded] = useState(false);
  const {
    nombre, monto, interes, fechaIngreso, fechaPrestamo, fechaVence,
    notas, estado, pagos = [],
    telefono, telefono2, direccion, barrio, ciudad, cedula, email, ocupacion, referencia,
    cuotasTotal, cuotaFrecuencia, cuotaMonto, fechaPrimeraCuota,
  } = prestamo;

  const total = calcTotal(monto, interes);
  const dias = diasRestantes(fechaVence);
  const urgente = estado === 'activo' && dias !== null && dias <= 7 && dias >= 0;
  const abonado = pagos.reduce((a, p) => a + p.monto, 0);
  const pendiente = total - abonado;
  const pct = total > 0 ? Math.min(100, (abonado / total) * 100) : 0;
  const hasAbonos = abonado > 0;

  const hasCliente = telefono || direccion || cedula;
  const hasCuotas = cuotasTotal > 0;

  let estadoLabel = 'Activo';
  let estadoClass = styles.activo;
  if (estado === 'pagado') { estadoLabel = 'Pagado'; estadoClass = styles.pagado; }
  else if (estado === 'vencido') { estadoLabel = 'Vencido'; estadoClass = styles.vencido; }
  else if (urgente) { estadoLabel = `${dias}d`; estadoClass = styles.urgente; }

  // Next cuota date
  function nextCuotaDate() {
    if (!fechaPrimeraCuota || !cuotaFrecuencia || !cuotasTotal) return null;
    const paid = pagos.length;
    if (paid >= cuotasTotal) return null;
    const d = new Date(fechaPrimeraCuota + 'T12:00:00');
    if (cuotaFrecuencia === 'diario') d.setDate(d.getDate() + paid);
    else if (cuotaFrecuencia === 'semanal') d.setDate(d.getDate() + paid * 7);
    else if (cuotaFrecuencia === 'quincenal') d.setDate(d.getDate() + paid * 15);
    else d.setMonth(d.getMonth() + paid);
    return d;
  }

  const nextCuota = nextCuotaDate();
  const diasCuota = nextCuota ? Math.ceil((nextCuota - new Date().setHours(0,0,0,0)) / 86400000) : null;
  const cuotaUrgente = diasCuota !== null && diasCuota <= 3 && diasCuota >= 0;

  return (
    <div className={`${styles.card} ${estado === 'pagado' ? styles.cardPagado : ''} ${estado === 'vencido' ? styles.cardVencido : ''} ${urgente ? styles.cardUrgente : ''}`}>
      {/* Top */}
      <div className={styles.top}>
        <div className={styles.left}>
          <div className={styles.nombre}>{nombre}</div>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${estadoClass}`}>{estadoLabel}</span>
            {hasCuotas && estado !== 'pagado' && (
              <span className={`${styles.badge} ${cuotaUrgente ? styles.urgente : styles.badgeCuota}`}>
                {pagos.length}/{cuotasTotal} cuotas
              </span>
            )}
          </div>
        </div>
        <div className={styles.monto}>
          <div className={styles.montoLabel}>{hasAbonos ? 'Pendiente' : 'Total'}</div>
          <div className={styles.montoValue}>{hasAbonos ? formatCOP(pendiente) : formatCOP(total)}</div>
          {interes > 0 && !hasAbonos && <div className={styles.montoSub}>{formatCOP(monto)} + {interes}%</div>}
          {hasAbonos && <div className={styles.montoSub}>{formatCOP(abonado)} de {formatCOP(total)}</div>}
        </div>
      </div>

      {/* Progress */}
      {hasAbonos && estado !== 'pagado' && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
          <span className={styles.progressPct}>{pct.toFixed(0)}%</span>
        </div>
      )}

      {/* Key dates row */}
      <div className={styles.dates}>
        {fechaIngreso && (
          <div className={styles.date}>
            <span className={styles.dateLabel}>Ingreso</span>
            <span className={styles.dateVal}>{formatDate(fechaIngreso)}</span>
          </div>
        )}
        {fechaPrestamo && (
          <div className={styles.date}>
            <span className={styles.dateLabel}>Prestado</span>
            <span className={styles.dateVal}>{formatDate(fechaPrestamo)}</span>
          </div>
        )}
        {fechaVence && (
          <div className={styles.date}>
            <span className={styles.dateLabel}>Vence</span>
            <span className={`${styles.dateVal} ${estado === 'vencido' ? styles.redText : urgente ? styles.amberText : ''}`}>
              {formatDate(fechaVence)}
            </span>
          </div>
        )}
        {nextCuota && estado !== 'pagado' && (
          <div className={styles.date}>
            <span className={styles.dateLabel}>Próx. cuota</span>
            <span className={`${styles.dateVal} ${cuotaUrgente ? styles.amberText : ''}`}>
              {formatDate(nextCuota.toISOString().split('T')[0])}
              {diasCuota === 0 && ' (hoy)'}
              {diasCuota === 1 && ' (mañana)'}
            </span>
          </div>
        )}
      </div>

      {/* Quick contact */}
      {telefono && (
        <div className={styles.quickContact}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12.6 19.79 19.79 0 0 1 1.61 4 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.98-.98a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <a href={`tel:${telefono}`} className={styles.contactLink}>{telefono}</a>
          {telefono2 && <><span style={{ color: 'var(--text3)' }}>·</span><a href={`tel:${telefono2}`} className={styles.contactLink}>{telefono2}</a></>}
        </div>
      )}

      {notas && <div className={styles.notas}>{notas}</div>}

      {/* Expand toggle */}
      {(hasCliente || hasCuotas) && (
        <button className={styles.expandBtn} onClick={() => setExpanded(x => !x)}>
          {expanded ? 'Ocultar detalles' : 'Ver detalles'}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className={styles.expandedBody}>
          {hasCliente && (
            <div className={styles.detailGroup}>
              <div className={styles.detailGroupTitle}>Información del cliente</div>
              {cedula && <DetailRow icon="🪪" label="Cédula" val={cedula} />}
              {ocupacion && <DetailRow icon="💼" label="Ocupación" val={ocupacion} />}
              {email && <DetailRow icon="✉️" label="Email" val={email} link={`mailto:${email}`} />}
              {(direccion || barrio || ciudad) && (
                <DetailRow icon="📍" label="Dirección"
                  val={[direccion, barrio, ciudad].filter(Boolean).join(', ')} />
              )}
              {referencia && <DetailRow icon="👥" label="Referencia" val={referencia} />}
            </div>
          )}
          {hasCuotas && (
            <div className={styles.detailGroup}>
              <div className={styles.detailGroupTitle}>Plan de cuotas</div>
              <DetailRow icon="🔢" label="Cuotas" val={`${pagos.length} de ${cuotasTotal} pagadas`} />
              {cuotaFrecuencia && <DetailRow icon="🔁" label="Frecuencia" val={cuotaFrecuencia} />}
              {cuotaMonto > 0 && <DetailRow icon="💵" label="Valor cuota" val={formatCOP(cuotaMonto)} />}
              {fechaPrimeraCuota && <DetailRow icon="📅" label="Primera cuota" val={formatDate(fechaPrimeraCuota)} />}
              {nextCuota && estado !== 'pagado' && (
                <DetailRow icon="⏰" label="Próxima cuota"
                  val={formatDate(nextCuota.toISOString().split('T')[0])}
                  highlight={cuotaUrgente} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`${styles.btn} ${estado === 'pagado' ? styles.btnActive : ''}`} onClick={() => onTogglePago(prestamo.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {estado === 'pagado' ? 'Cobrado' : 'Pagado'}
          </button>
          {estado !== 'pagado' && (
            <button className={styles.btn} onClick={() => onPagos(prestamo)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Abonar
            </button>
          )}
        </div>
        <div className={styles.iconBtns}>
          <button className={styles.iconBtn} onClick={() => onEdit(prestamo)} title="Editar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => onDelete(prestamo.id)} title="Eliminar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, val, link, highlight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0' }}>
      <span style={{ fontSize: 13, opacity: 0.7, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.5px', minWidth: 72, flexShrink: 0 }}>{label}</span>
      {link
        ? <a href={link} style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none' }}>{val}</a>
        : <span style={{ fontSize: 13, color: highlight ? 'var(--gold)' : 'var(--text2)' }}>{val}</span>
      }
    </div>
  );
}
