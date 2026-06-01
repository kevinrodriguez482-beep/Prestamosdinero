import styles from './ConfirmModal.module.css';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.icon}>⚠</div>
        <h3 className={styles.title}>{title || '¿Estás seguro?'}</h3>
        <p className={styles.message}>{message || 'Esta acción no se puede deshacer.'}</p>
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnDanger} onClick={() => { onConfirm(); onClose(); }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
