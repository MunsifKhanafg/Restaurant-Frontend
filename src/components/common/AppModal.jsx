import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── Context ──────────────────────────────────────────────
const ModalContext = createContext(null);

export function useModal() {
  return useContext(ModalContext);
}

// ─── Provider ─────────────────────────────────────────────
export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);

  // showModal('success' | 'error' | 'warning' | 'info', title, message, onOk?)
  // If onOk is provided and type is 'warning', renders as a confirm dialog with Cancel + Confirm buttons
  const showModal = useCallback((type, title, message, onOk) => {
    setModal({ type, title, message, onOk });
  }, []);

  const closeModal = useCallback(() => {
    const cb = modal?.onOk;
    setModal(null);
    cb?.();
  }, [modal]);

  const cancelModal = useCallback(() => {
    setModal(null); // close without calling onOk
  }, []);

  const META = {
    success: { icon: '✅', color: 'var(--green)',  bg: 'rgba(76,175,125,0.12)',  border: 'rgba(76,175,125,0.3)'  },
    error:   { icon: '❌', color: '#ef4444',       bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)'   },
    warning: { icon: '⚠️', color: '#f59e0b',       bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    info:    { icon: 'ℹ️', color: 'var(--gold)',    bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.3)' },
  };

  const m = modal ? (META[modal.type] || META.info) : null;

  return (
    <ModalContext.Provider value={showModal}>
      {children}

      {/* Global Modal Overlay */}
      {modal && (
        <div
          onClick={e => e.target === e.currentTarget && cancelModal()}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            animation: 'modalFadeIn 0.15s ease',
          }}
        >
          <div
            className="glass-card-elevated"
            style={{
              width: '100%', maxWidth: '380px', padding: '32px 28px',
              textAlign: 'center', position: 'relative',
              border: `1px solid ${m.border}`,
              animation: 'modalSlideUp 0.2s ease',
            }}
          >
            {/* Close × */}
            <button
              onClick={modal.onOk ? cancelModal : closeModal}
              style={{ position: 'absolute', top: '14px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
            >×</button>

            {/* Icon */}
            <div style={{ fontSize: '44px', marginBottom: '14px', lineHeight: 1 }}>{m.icon}</div>

            {/* Title */}
            <h2 style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '21px', fontWeight: '700',
              color: m.color, marginBottom: '10px', lineHeight: 1.25,
            }}>
              {modal.title}
            </h2>

            {/* Message */}
            <p style={{
              fontSize: '13px', color: 'var(--text-secondary)',
              lineHeight: 1.65, marginBottom: '22px',
            }}>
              {modal.message}
            </p>

            {/* OK / Confirm Button(s) */}
            {modal.onOk ? (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={cancelModal}
                  style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontFamily: '"DM Sans", sans-serif' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >Cancel</button>
                <button
                  onClick={closeModal}
                  style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', border: `1px solid ${m.border}`, background: m.bg, color: m.color, transition: 'opacity 0.15s', fontFamily: '"DM Sans", sans-serif' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >Confirm</button>
              </div>
            ) : (
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 40px', borderRadius: '8px', fontSize: '13px',
                  fontWeight: '700', cursor: 'pointer', border: `1px solid ${m.border}`,
                  background: m.bg, color: m.color, transition: 'opacity 0.15s',
                  fontFamily: '"DM Sans", sans-serif',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                OK
              </button>
            )}
          </div>

          <style>{`
            @keyframes modalFadeIn  { from { opacity:0 } to { opacity:1 } }
            @keyframes modalSlideUp { from { transform:translateY(18px); opacity:0 } to { transform:translateY(0); opacity:1 } }
          `}</style>
        </div>
      )}
    </ModalContext.Provider>
  );
}
