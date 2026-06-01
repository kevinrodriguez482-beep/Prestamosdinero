import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { loadData, saveData, formatCOP, calcTotal, diasRestantes } from '../lib/storage';
import StatCard from '../components/StatCard';
import LoanCard from '../components/LoanCard';
import LoanModal from '../components/LoanModal';
import ConfirmModal from '../components/ConfirmModal';
import PaymentsModal from '../components/PaymentsModal';
import Analytics from '../components/Analytics';

const FILTROS = ['todos', 'activo', 'vencido', 'urgente', 'pagado'];
const FILTRO_LABELS = { todos: 'Todos', activo: 'Activos', vencido: 'Vencidos', urgente: 'Urgentes', pagado: 'Pagados' };

export default function Home() {
  const [data, setData] = useState({ prestamos: [], nextId: 1 });
  const [mounted, setMounted] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('fecha');
  const [pagosModal, setPagosModal] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  useEffect(() => { setData(loadData()); setMounted(true); }, []);

  function handleBackup() {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fecha = new Date().toISOString().split('T')[0];
    a.href = url; a.download = `prestamos-backup-${fecha}.json`;
    a.click(); URL.revokeObjectURL(url);
    setBackupMsg('✓ Descargado');
    setTimeout(() => setBackupMsg(''), 2500);
  }

  function handleRestore(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.prestamos || !Array.isArray(parsed.prestamos)) throw new Error('Formato inválido');
        persist(parsed);
        setBackupMsg(`✓ ${parsed.prestamos.length} préstamos restaurados`);
        setTimeout(() => setBackupMsg(''), 3000);
      } catch {
        setBackupMsg('✗ Archivo inválido');
        setTimeout(() => setBackupMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function persist(newData) { setData(newData); saveData(newData); }

  const prestamos = useMemo(() => data.prestamos.map(p => {
    if (p.estado === 'activo' && p.fechaVence) {
      const d = diasRestantes(p.fechaVence);
      if (d !== null && d < 0) return { ...p, estado: 'vencido' };
    }
    return p;
  }), [data.prestamos]);

  const filtered = useMemo(() => {
    let list = [...prestamos];
    if (filtro === 'urgente') list = list.filter(p => {
      const d = diasRestantes(p.fechaVence);
      return p.estado === 'activo' && d !== null && d <= 7 && d >= 0;
    });
    else if (filtro !== 'todos') list = list.filter(p => p.estado === filtro);
    if (search) list = list.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'fecha') list.sort((a, b) => (b.fechaPrestamo || '').localeCompare(a.fechaPrestamo || ''));
    else if (sort === 'monto') list.sort((a, b) => calcTotal(b.monto, b.interes) - calcTotal(a.monto, a.interes));
    else if (sort === 'nombre') list.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return list;
  }, [prestamos, filtro, search, sort]);

  const stats = useMemo(() => {
    const activos = prestamos.filter(p => p.estado !== 'pagado');
    const pagados = prestamos.filter(p => p.estado === 'pagado');
    const vencidos = prestamos.filter(p => p.estado === 'vencido');
    const urgentes = prestamos.filter(p => {
      const d = diasRestantes(p.fechaVence);
      return p.estado === 'activo' && d !== null && d <= 7 && d >= 0;
    });
    // Account for partial payments in "por cobrar"
    const porCobrar = activos.reduce((a, p) => {
      const total = calcTotal(p.monto, p.interes);
      const abonado = (p.pagos || []).reduce((s, ab) => s + ab.monto, 0);
      return a + Math.max(0, total - abonado);
    }, 0);
    return {
      porCobrar,
      recuperado: pagados.reduce((a, p) => a + calcTotal(p.monto, p.interes), 0),
      totalPrestado: prestamos.reduce((a, p) => a + p.monto, 0),
      countVencidos: vencidos.length,
      countUrgentes: urgentes.length,
    };
  }, [prestamos]);

  function handleSave(form) {
    if (modal === 'nuevo') {
      const nuevo = { ...form, id: data.nextId, pagos: [] };
      persist({ ...data, prestamos: [...data.prestamos, nuevo], nextId: data.nextId + 1 });
    } else {
      persist({ ...data, prestamos: data.prestamos.map(p => p.id === modal.id ? { ...p, ...form, id: modal.id } : p) });
    }
  }

  function handleTogglePago(id) {
    persist({
      ...data,
      prestamos: data.prestamos.map(p =>
        p.id === id ? { ...p, estado: p.estado === 'pagado' ? 'activo' : 'pagado' } : p
      )
    });
  }

  function handleDelete(id) {
    persist({ ...data, prestamos: data.prestamos.filter(p => p.id !== id) });
  }

  function handleAddPago(prestamoId, pago) {
    const newPrestamos = data.prestamos.map(p => {
      if (p.id !== prestamoId) return p;
      const pagos = [...(p.pagos || []), pago];
      const total = calcTotal(p.monto, p.interes);
      const abonado = pagos.reduce((a, ab) => a + ab.monto, 0);
      const estado = abonado >= total - 0.01 ? 'pagado' : p.estado;
      return { ...p, pagos, estado };
    });
    const newData = { ...data, prestamos: newPrestamos };
    persist(newData);
    // Update pagosModal with fresh data
    const updated = newPrestamos.find(p => p.id === prestamoId);
    if (updated) setPagosModal(updated);
  }

  function handleDeletePago(prestamoId, pagoId) {
    const newPrestamos = data.prestamos.map(p => {
      if (p.id !== prestamoId) return p;
      const pagos = (p.pagos || []).filter(ab => ab.id !== pagoId);
      return { ...p, pagos };
    });
    const newData = { ...data, prestamos: newPrestamos };
    persist(newData);
    const updated = newPrestamos.find(p => p.id === prestamoId);
    if (updated) setPagosModal(updated);
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      const { exportPDF } = await import('../lib/exportPDF');
      await exportPDF(prestamos);
    } catch (e) { console.error(e); }
    setExporting(false);
  }

  if (!mounted) return null;

  const countByFiltro = {
    todos: prestamos.length,
    activo: prestamos.filter(p => p.estado === 'activo').length,
    vencido: prestamos.filter(p => p.estado === 'vencido').length,
    urgente: prestamos.filter(p => { const d = diasRestantes(p.fechaVence); return p.estado === 'activo' && d !== null && d <= 7 && d >= 0; }).length,
    pagado: prestamos.filter(p => p.estado === 'pagado').length,
  };

  return (
    <>
      <Head>
        <title>Préstamos — Control de deudas</title>
        <meta name="description" content="Gestiona tus préstamos personales" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💰</text></svg>" />
      </Head>

      <div className={styles.root}>
        <div className={styles.glow1} />
        <div className={styles.glow2} />

        <header className={styles.header}>
          <div className={styles.container}>
            <div className={styles.headerInner}>
              <div>
                <div className={styles.headerEyebrow}>Panel de control</div>
                <h1 className={styles.headerTitle}>Préstamos</h1>
              </div>
              <div className={styles.headerActions}>
                <button className={styles.btnSecondary} onClick={() => setAnalyticsOpen(true)} title="Ver gráficas">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  Gráficas
                </button>
                <button className={styles.btnSecondary} onClick={handleExportPDF} disabled={exporting || prestamos.length === 0} title="Exportar PDF">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  {exporting ? 'Generando...' : 'PDF'}
                </button>

                {/* Backup / Restore group */}
                <div className={styles.backupGroup}>
                  <button className={styles.btnSecondary} onClick={handleBackup} disabled={prestamos.length === 0} title="Descargar copia de seguridad JSON">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Backup
                  </button>
                  <label className={styles.btnSecondary} title="Restaurar desde archivo JSON" style={{ cursor: 'pointer' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Restaurar
                    <input type="file" accept=".json" onChange={handleRestore} style={{ display: 'none' }} />
                  </label>
                  {backupMsg && (
                    <span className={`${styles.backupMsg} ${backupMsg.startsWith('✗') ? styles.backupMsgError : ''}`}>
                      {backupMsg}
                    </span>
                  )}
                </div>

                <button className={styles.btnNew} onClick={() => setModal('nuevo')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Nuevo préstamo
                </button>
              </div>
            </div>

            <div className={`${styles.statsGrid} stagger`}>
              <StatCard icon="💵" label="Por cobrar" value={formatCOP(stats.porCobrar)} sub={`${prestamos.filter(p => p.estado !== 'pagado').length} préstamos activos`} color="accent" />
              <StatCard icon="📥" label="Total prestado" value={formatCOP(stats.totalPrestado)} sub={`${prestamos.length} préstamos en total`} color="gold" />
              <StatCard icon="✅" label="Recuperado" value={formatCOP(stats.recuperado)} sub={`${prestamos.filter(p => p.estado === 'pagado').length} ya pagados`} color="blue" />
              {stats.countVencidos > 0 ? (
                <StatCard icon="⚠️" label="Vencidos" value={stats.countVencidos} sub="Requieren atención" color="red" />
              ) : (
                <StatCard icon="🎯" label="Urgentes (7d)" value={stats.countUrgentes || 'Ninguno'} sub="Por vencer pronto" color="gold" />
              )}
            </div>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.toolbar}>
              <div className={styles.filters}>
                {FILTROS.map(f => (
                  <button key={f} onClick={() => setFiltro(f)}
                    className={`${styles.filterBtn} ${filtro === f ? styles.filterActive : ''}`}>
                    {FILTRO_LABELS[f]}
                    <span className={styles.filterCount}>{countByFiltro[f]}</span>
                  </button>
                ))}
              </div>
              <div className={styles.toolbarRight}>
                <div className={styles.searchWrap}>
                  <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input className={styles.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." />
                </div>
                <select className={styles.sortSelect} value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="fecha">Más reciente</option>
                  <option value="monto">Mayor monto</option>
                  <option value="nombre">Nombre</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>{search || filtro !== 'todos' ? '🔍' : '💰'}</div>
                <div className={styles.emptyTitle}>
                  {search || filtro !== 'todos' ? 'Sin resultados' : 'Sin préstamos aún'}
                </div>
                <div className={styles.emptyText}>
                  {search || filtro !== 'todos' ? 'Prueba con otros filtros.' : 'Registra tu primer préstamo para empezar.'}
                </div>
                {!search && filtro === 'todos' && (
                  <button className={styles.btnNew} style={{ marginTop: 20 }} onClick={() => setModal('nuevo')}>
                    + Registrar préstamo
                  </button>
                )}
              </div>
            ) : (
              <div className={`${styles.grid} stagger`}>
                {filtered.map(p => (
                  <LoanCard key={p.id} prestamo={p}
                    onEdit={p => setModal(p)}
                    onDelete={id => setConfirm(id)}
                    onTogglePago={handleTogglePago}
                    onPagos={p => setPagosModal(p)} />
                ))}
              </div>
            )}
          </div>
        </main>

        <footer className={styles.footer}>
          <div className={styles.container}>
            <span>Préstamos — datos guardados localmente en tu navegador</span>
          </div>
        </footer>
      </div>

      <LoanModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        onSave={handleSave}
        initial={modal !== 'nuevo' ? modal : null}
      />
      <ConfirmModal
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title="¿Eliminar préstamo?"
        message="Esta acción eliminará el préstamo permanentemente y no se puede deshacer."
      />
      <PaymentsModal
        isOpen={pagosModal !== null}
        prestamo={pagosModal}
        onClose={() => setPagosModal(null)}
        onAddPago={handleAddPago}
        onDeletePago={handleDeletePago}
      />
      <Analytics
        prestamos={prestamos}
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />
    </>
  );
}
