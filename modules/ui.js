/* ============================================================
   ui.js — Toasts e helpers UI compartilhados
   ============================================================ */

const UI = (() => {
  function toast(message, type = 'default', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 200ms ease, transform 200ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 220);
    }, duration);
  }

  function confirm(message) {
    return window.confirm(message);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateOnly(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
  }

  function calculateAge(dataNascimento) {
    if (!dataNascimento) return null;
    const today = new Date();
    const birth = new Date(dataNascimento);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function avatarColorFromName(name) {
    if (!name) return '#94A3B8';
    // Paleta segura para fundo + texto branco
    const palette = [
      '#0F766E', '#166534', '#15803D', '#065F46',
      '#1E40AF', '#1D4ED8', '#0369A1', '#0E7490',
      '#7C2D12', '#9A3412', '#9F1239', '#831843',
      '#581C87', '#5B21B6', '#4338CA'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    return palette[Math.abs(hash) % palette.length];
  }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function autoGrowTextarea(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight + 2) + 'px';
  }

  return {
    toast,
    confirm,
    formatDate,
    formatDateOnly,
    calculateAge,
    avatarColorFromName,
    getInitials,
    escapeHtml,
    debounce,
    autoGrowTextarea
  };
})();

window.UI = UI;
if (typeof module !== 'undefined' && module.exports) module.exports = window.UI;
