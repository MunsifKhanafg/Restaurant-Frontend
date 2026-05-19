import React, { useState, useRef } from 'react';

/**
 * ImageUpload — Drag-and-drop / click-to-upload component.
 *
 * Props:
 *   value       — current preview URL (string)
 *   onChange    — callback(file, previewUrl) when a new image is selected
 *   label       — optional label string (default: 'Product Image')
 *   height      — preview area height in px (default: 150)
 */
export default function ImageUpload({
  value = '',
  onChange,
  label = 'Product Image',
  height = 150,
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const previewUrl = URL.createObjectURL(file);
    onChange?.(file, previewUrl);
  };

  const handleFileInput = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  return (
    <div>
      {label && (
        <label style={{
          display: 'block', fontSize: '11px', color: 'var(--gold)',
          letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px',
        }}>
          {label}
        </label>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--border)'}`,
          borderRadius: '8px',
          cursor: 'pointer',
          background: dragging ? 'rgba(212,175,55,0.06)' : 'var(--bg-elevated)',
          overflow: 'hidden',
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Overlay on hover */}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
            >
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>📷 Change Image</span>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>
              {dragging ? 'Drop image here' : 'Click or drag image here'}
            </div>
            <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
              PNG, JPG, WEBP supported
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
}
