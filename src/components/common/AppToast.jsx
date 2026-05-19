import React from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * AppToast — global toast notification renderer.
 * Placed once in MainLayout so toasts appear app-wide.
 * Uses react-hot-toast which is already installed in this project.
 */
export default function AppToast() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={10}
      toastOptions={{
        duration: 3000,
        style: {
          background: 'var(--bg-elevated, #1a1a1a)',
          color: 'var(--text-primary, #f0e6c8)',
          border: '1px solid var(--border, rgba(212,175,55,0.2))',
          borderRadius: '10px',
          fontSize: '13px',
          fontFamily: '"DM Sans", sans-serif',
          padding: '10px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxWidth: '360px',
        },
        success: {
          iconTheme: {
            primary: '#4CAF7D',
            secondary: '#0D0D0D',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          duration: 4000,
        },
      }}
    />
  );
}
