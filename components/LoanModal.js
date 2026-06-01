import { useState, useEffect } from 'react';
import styles from './LoanModal.module.css';

const empty = {
  // Préstamo
  nombre: '', monto: '', interes: '',
  fechaIngreso: new Date().toISOString().split('T')[0],
  fechaPrestamo: new Date().toISOString().split('T')[0],
  fechaVence: '', notas: '', estado: 'activo',
  // Cliente
  telefono: '', telefono2: '', direccion: '', barrio: '', ciudad: '',
  cedula: '', email: '', ocupacion: '', referencia: '',
  // Cuotas
  cuotasTotal: '', cuotaFrecuencia: 'mensual', cuotaMonto: '', fechaPrimeraCuota: '',
};

const TABS = [
  { id: 'prestamo', label: 'Préstamo', icon: '💵' },
  { id: 'cliente', label: 'Cliente', icon: '👤' },
  { id: 'cuotas', label: 'Cuotas', icon: '📅' },
];

const FRECUENCIAS = [
  { v: 'diario', l: 'Diario' },
  { v: 'semanal', l: 'Semanal' },
  { v: 'quincenal', l: 'Quincenal' },
  { v: 'mensual', l: 'Mensual' },
];

export default function LoanModal({ isOpen, onClose, onSave, initial }) {
  const [tab, setTab] = useState('prestamo');
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (initial) {
        setForm({
          ...empty, ...initial,
          monto: String(initial.monto || ''),
          interes: String(initial.interes || ''),
          cuotasTotal: String(initial.cuotasTotal || ''),
          cuotaMonto: String(initial.cuotaMonto || ''),
        });
      } else {
        setForm(empty);
      }
      setErrors({});
      setTab('prestamo');
    }
  }, [isOpen, initial]);

  function set(k, v) {
    setForm(p => {
      const next = { ...p, [k]: v };
      // Auto-calc cuota monto when monto + interes + cuotasTotal change
      if (['monto','interes','cuotasTotal'].includes(k)) {
        const m = parseFloat(k === 'monto' ? v : next.monto) || 0;
        const i = parseFloat(k === 'interes' ? v : next.interes) || 0;
        const c = parseInt(k === 'cuotasTotal' ? v : next.cuotasTotal) || 0;
        if (m > 0 && c > 0) next.cuotaMonto = String(Math.ceil((m + m * i / 100) / c));
      }
      return next;
    });
    setErrors(e => ({ ...e, [k]: '' }));
  }

  function validate() {
    const e = {};
    if (!form.nombre.trim()) { e.nombre = 'Requerido'; }
    if (!form.monto || parseFloat(form.monto) <= 0) { e.monto = 'Requerido'; }
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); setTab('prestamo'); return; }
    onSave({
      ...form,
      nombre: form.nombre.trim(),
      monto: parseFloat(form.monto) || 0,
      interes: parseFloat(form.interes) || 0,
      cuotasTotal: parseInt(form.cuotasTotal) || 0,
      cuotaMonto: parseFloat(form.cuotaMonto) || 0,
      notas: form.notas.trim(),
      telefono: form.telefono.trim(),
      telefono2: form.telefono2.trim(),
      direccion: form.direccion.trim(),
      barrio: form.barrio.trim(),
      ciudad: form.ciudad.trim(),
      cedula: form.cedula.trim(),
      email: form.email.trim(),
      ocupacion: form.ocupacion.trim(),
      referencia: form.referencia.trim(),
    });
    onClose();
  }

  if (!isOpen) return null;

  const total = (parseFloat(form.monto) || 0) * (1 + (parseFloat(form.interes) || 0) / 100);
  const fmt = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>{initial ? 'Editar' : 'Nuevo'}</div>
            <h2 className={styles.title}>{form.nombre || 'Préstamo'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}>
              <span>{t.icon}</span> {t.label}
              {t.id === 'prestamo' && (errors.nombre || errors.monto) && <span className={styles.tabError}>!</span>}
            </button>
          ))}
        </div>

        <div className={styles.body}>

          {/* ── TAB: PRÉSTAMO ── */}
          {tab === 'prestamo' && (
            <div className={styles.section}>
              <F label="Nombre del deudor *" error={errors.nombre}>
                <input className={`${styles.input} ${errors.nombre ? styles.inputError : ''}`}
                  value={form.nombre} onChange={e => set('nombre', e.target.value)}
                  placeholder="Nombre completo" autoFocus />
              </F>
              <div className={styles.row2}>
                <F label="Monto prestado *" error={errors.monto}>
                  <input className={`${styles.input} ${errors.monto ? styles.inputError : ''}`}
                    type="number" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0" min="0" />
                </F>
                <F label="Interés (%)">
                  <input className={styles.input} type="number" value={form.interes}
                    onChange={e => set('interes', e.target.value)} placeholder="0" min="0" step="0.1" />
                </F>
              </div>
              <div className={styles.row2}>
                <F label="Fecha de ingreso">
                  <input className={styles.input} type="date" value={form.fechaIngreso}
                    onChange={e => set('fechaIngreso', e.target.value)} />
                </F>
                <F label="Fecha del préstamo">
                  <input className={styles.input} type="date" value={form.fechaPrestamo}
                    onChange={e => set('fechaPrestamo', e.target.value)} />
                </F>
              </div>
              <F label="Fecha de vencimiento total">
                <input className={styles.input} type="date" value={form.fechaVence}
                  onChange={e => set('fechaVence', e.target.value)} />
              </F>
              {total > 0 && (
                <div className={styles.preview}>
                  <span>Total a cobrar</span>
                  <span className={styles.previewVal}>{fmt(total)}</span>
                </div>
              )}
              <F label="Estado">
                <div className={styles.radioGroup}>
                  {[['activo','Activo'],['pagado','Pagado'],['vencido','Vencido']].map(([v,l]) => (
                    <label key={v} className={`${styles.radio} ${form.estado === v ? styles.radioActive : ''}`}>
                      <input type="radio" name="estado" value={v} checked={form.estado === v} onChange={() => set('estado', v)} />
                      {l}
                    </label>
                  ))}
                </div>
              </F>
              <F label="Notas">
                <textarea className={`${styles.input} ${styles.textarea}`} value={form.notas}
                  onChange={e => set('notas', e.target.value)} placeholder="Observaciones..." rows={2} />
              </F>
            </div>
          )}

          {/* ── TAB: CLIENTE ── */}
          {tab === 'cliente' && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Identificación</div>
              <div className={styles.row2}>
                <F label="Cédula / ID">
                  <input className={styles.input} value={form.cedula}
                    onChange={e => set('cedula', e.target.value)} placeholder="123456789" />
                </F>
                <F label="Ocupación">
                  <input className={styles.input} value={form.ocupacion}
                    onChange={e => set('ocupacion', e.target.value)} placeholder="Empleado, negocio..." />
                </F>
              </div>
              <div className={styles.sectionTitle} style={{ marginTop: 4 }}>Contacto</div>
              <div className={styles.row2}>
                <F label="Teléfono principal">
                  <input className={styles.input} type="tel" value={form.telefono}
                    onChange={e => set('telefono', e.target.value)} placeholder="300 000 0000" />
                </F>
                <F label="Teléfono alternativo">
                  <input className={styles.input} type="tel" value={form.telefono2}
                    onChange={e => set('telefono2', e.target.value)} placeholder="Opcional" />
                </F>
              </div>
              <F label="Correo electrónico">
                <input className={styles.input} type="email" value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
              </F>
              <div className={styles.sectionTitle} style={{ marginTop: 4 }}>Ubicación</div>
              <F label="Dirección">
                <input className={styles.input} value={form.direccion}
                  onChange={e => set('direccion', e.target.value)} placeholder="Calle 10 # 5-30" />
              </F>
              <div className={styles.row2}>
                <F label="Barrio">
                  <input className={styles.input} value={form.barrio}
                    onChange={e => set('barrio', e.target.value)} placeholder="Nombre del barrio" />
                </F>
                <F label="Ciudad">
                  <input className={styles.input} value={form.ciudad}
                    onChange={e => set('ciudad', e.target.value)} placeholder="Ciudad" />
                </F>
              </div>
              <F label="Referencia personal">
                <input className={styles.input} value={form.referencia}
                  onChange={e => set('referencia', e.target.value)} placeholder="Nombre y teléfono de referencia" />
              </F>
            </div>
          )}

          {/* ── TAB: CUOTAS ── */}
          {tab === 'cuotas' && (
            <div className={styles.section}>
              {!(parseFloat(form.monto) > 0) && (
                <div className={styles.cuotasWarning}>
                  Primero ingresa el monto en la pestaña Préstamo
                </div>
              )}
              <div className={styles.row2}>
                <F label="Número de cuotas">
                  <input className={styles.input} type="number" value={form.cuotasTotal}
                    onChange={e => set('cuotasTotal', e.target.value)} placeholder="12" min="1" />
                </F>
                <F label="Frecuencia">
                  <select className={styles.input} value={form.cuotaFrecuencia}
                    onChange={e => set('cuotaFrecuencia', e.target.value)}>
                    {FRECUENCIAS.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
                  </select>
                </F>
              </div>
              <div className={styles.row2}>
                <F label="Valor por cuota">
                  <input className={styles.input} type="number" value={form.cuotaMonto}
                    onChange={e => set('cuotaMonto', e.target.value)} placeholder="Auto-calculado" min="0" />
                </F>
                <F label="Fecha primera cuota">
                  <input className={styles.input} type="date" value={form.fechaPrimeraCuota}
                    onChange={e => set('fechaPrimeraCuota', e.target.value)} />
                </F>
              </div>

              {/* Cuota preview */}
              {parseFloat(form.cuotaMonto) > 0 && parseInt(form.cuotasTotal) > 0 && (
                <div className={styles.cuotaPreview}>
                  <div className={styles.cuotaPreviewRow}>
                    <span>Cuota {form.cuotaFrecuencia}</span>
                    <span className={styles.cuotaVal}>{fmt(parseFloat(form.cuotaMonto))}</span>
                  </div>
                  <div className={styles.cuotaPreviewRow}>
                    <span>× {form.cuotasTotal} cuotas</span>
                    <span>{fmt(parseFloat(form.cuotaMonto) * parseInt(form.cuotasTotal))}</span>
                  </div>
                  {total > 0 && (
                    <div className={styles.cuotaPreviewRow} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 4 }}>
                      <span>Total del préstamo</span>
                      <span style={{ color: 'var(--gold)' }}>{fmt(total)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Cuota schedule preview */}
              {parseInt(form.cuotasTotal) > 0 && form.fechaPrimeraCuota && (
                <div className={styles.scheduleWrap}>
                  <div className={styles.scheduleTitle}>Calendario de cuotas</div>
                  <div className={styles.scheduleList}>
                    {Array.from({ length: Math.min(parseInt(form.cuotasTotal), 6) }).map((_, i) => {
                      const d = new Date(form.fechaPrimeraCuota + 'T12:00:00');
                      const freq = form.cuotaFrecuencia;
                      if (freq === 'diario') d.setDate(d.getDate() + i);
                      else if (freq === 'semanal') d.setDate(d.getDate() + i * 7);
                      else if (freq === 'quincenal') d.setDate(d.getDate() + i * 15);
                      else d.setMonth(d.getMonth() + i);
                      const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
                      return (
                        <div key={i} className={styles.scheduleItem}>
                          <span className={styles.scheduleNum}>#{i + 1}</span>
                          <span className={styles.scheduleDate}>{label}</span>
                          <span className={styles.scheduleMonto}>{form.cuotaMonto ? fmt(parseFloat(form.cuotaMonto)) : '—'}</span>
                        </div>
                      );
                    })}
                    {parseInt(form.cuotasTotal) > 6 && (
                      <div className={styles.scheduleMore}>+ {parseInt(form.cuotasTotal) - 6} cuotas más</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave}>
            {initial ? 'Guardar cambios' : 'Registrar préstamo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
      <label style={{ fontSize: '10.5px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 500 }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: '11px', color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}
