import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    activeModal: null,
    modalData: null,
    notifications: [],
    theme: 'dark',
    // App-wide toast/notification queue
    toasts: [],
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebar: (state, action) => { state.sidebarOpen = action.payload; },
    openModal: (state, action) => {
      state.activeModal = action.payload.modal;
      state.modalData = action.payload.data || null;
    },
    closeModal: (state) => { state.activeModal = null; state.modalData = null; },
    addNotification: (state, action) => {
      state.notifications.unshift({ id: Date.now(), ...action.payload });
      if (state.notifications.length > 20) state.notifications.pop();
    },
    clearNotifications: (state) => { state.notifications = []; },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    // Global slide-in toast notifications
    pushToast: (state, action) => {
      const toast = {
        id: Date.now() + Math.random(),
        type: action.payload.type || 'info',   // success | error | warning | info | order
        title: action.payload.title || '',
        message: action.payload.message || '',
        duration: action.payload.duration ?? 4000,
      };
      state.toasts.push(toast);
      // Keep max 5 toasts visible
      if (state.toasts.length > 5) state.toasts.shift();
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
  },
});

export const {
  toggleSidebar, setSidebar,
  openModal, closeModal,
  addNotification, clearNotifications,
  toggleTheme, setTheme,
  pushToast, removeToast,
} = uiSlice.actions;
export default uiSlice.reducer;
