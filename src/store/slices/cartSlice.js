import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    tableNumber: null,
    orderType: 'dine-in',
    customerInfo: {},
    notes: '',
    discountAmount: 0,
    taxPercent: parseFloat(process.env.REACT_APP_TAX_PERCENT) || 8,
  },
  reducers: {
    addItem: (state, action) => {
      const existing = state.items.find(i => i.product === action.payload.product);
      if (existing) {
        existing.quantity += action.payload.quantity || 1;
      } else {
        state.items.push({ ...action.payload, quantity: action.payload.quantity || 1 });
      }
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(i => i.product !== action.payload);
    },
    updateQuantity: (state, action) => {
      const { product, quantity } = action.payload;
      const item = state.items.find(i => i.product === product);
      if (item) {
        if (quantity <= 0) state.items = state.items.filter(i => i.product !== product);
        else item.quantity = quantity;
      }
    },
    updateItemNote: (state, action) => {
      const { product, note } = action.payload;
      const item = state.items.find(i => i.product === product);
      if (item) item.specialInstructions = note;
    },
    setTableNumber: (state, action) => { state.tableNumber = action.payload; },
    setOrderType: (state, action) => { state.orderType = action.payload; },
    setCustomerInfo: (state, action) => { state.customerInfo = action.payload; },
    setNotes: (state, action) => { state.notes = action.payload; },
    setDiscount: (state, action) => { state.discountAmount = action.payload; },
    clearCart: (state) => {
      state.items = [];
      state.tableNumber = null;
      state.customerInfo = {};
      state.notes = '';
      state.discountAmount = 0;
      state.orderType = 'dine-in';
    },
  },
});

export const {
  addItem, removeItem, updateQuantity, updateItemNote,
  setTableNumber, setOrderType, setCustomerInfo, setNotes, setDiscount, clearCart,
} = cartSlice.actions;

// Selectors
export const selectCartSubtotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export const selectCartTax = (state) => {
  const subtotal = selectCartSubtotal(state);
  return (subtotal * state.cart.taxPercent) / 100;
};

export const selectCartTotal = (state) => {
  const subtotal = selectCartSubtotal(state);
  const tax = selectCartTax(state);
  return subtotal + tax - (state.cart.discountAmount || 0);
};

export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0);

export default cartSlice.reducer;
