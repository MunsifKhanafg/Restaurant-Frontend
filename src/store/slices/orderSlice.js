import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

/* ── helper: extract a readable message from any Axios error ── */
const extractError = (err) =>
  err.response?.data?.message ||
  err.response?.data?.error   ||
  err.message                 ||
  'An unexpected error occurred';

export const fetchOrders = createAsyncThunk(
  'orders/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/orders', { params });
      return data.data;
    } catch (err) { return rejectWithValue(extractError(err)); }
  },
);

export const fetchKitchenOrders = createAsyncThunk(
  'orders/kitchen',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/orders/kitchen');
      return data.data;
    } catch (err) { return rejectWithValue(extractError(err)); }
  },
);

export const createOrder = createAsyncThunk(
  'orders/create',
  async (orderData, { rejectWithValue }) => {
    try {
      // Guest orders: use plain fetch without auth header to avoid token errors
      const isGuest = !localStorage.getItem('token');
      if (isGuest) {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/orders`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Order failed');
        return data.data;
      }
      const { data } = await api.post('/orders', orderData);
      return data.data;
    } catch (err) { return rejectWithValue(extractError(err)); }
  },
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async ({ id, status, itemId, itemStatus }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/orders/${id}/status`, { status, itemId, itemStatus });
      return data.data;
    } catch (err) { return rejectWithValue(extractError(err)); }
  },
);

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    items:         [],
    kitchenOrders: [],
    loading:       false,
    error:         null,
    lastCreated:   null,
  },
  reducers: {
    addSocketOrder: (state, action) => {
      /* avoid duplicate if server also returns it via HTTP */
      const exists = state.kitchenOrders.some(o => o._id === action.payload._id);
      if (!exists) state.kitchenOrders.unshift(action.payload);
    },
    updateSocketOrder: (state, action) => {
      const { _id, orderStatus } = action.payload;
      /* update main list */
      const idx = state.items.findIndex(o => o._id === _id);
      if (idx !== -1) state.items[idx] = action.payload;
      /* update kitchen queue */
      const kidx = state.kitchenOrders.findIndex(o => o._id === _id);
      if (kidx !== -1) {
        if (['ready', 'completed', 'delivered', 'cancelled'].includes(orderStatus)) {
          state.kitchenOrders.splice(kidx, 1);
        } else {
          state.kitchenOrders[kidx] = action.payload;
        }
      }
    },
    clearLastCreated: (state) => { state.lastCreated = null; },
    clearOrderError:  (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      /* fetchOrders */
      .addCase(fetchOrders.pending,   (state)          => { state.loading = true; state.error = null; })
      .addCase(fetchOrders.fulfilled, (state, action)  => { state.loading = false; state.items = action.payload; })
      .addCase(fetchOrders.rejected,  (state, action)  => { state.loading = false; state.error = action.payload; })
      /* fetchKitchenOrders */
      .addCase(fetchKitchenOrders.fulfilled, (state, action) => { state.kitchenOrders = action.payload; })
      /* createOrder */
      .addCase(createOrder.pending,   (state)          => { state.loading = true; state.error = null; })
      .addCase(createOrder.fulfilled, (state, action)  => {
        state.loading     = false;
        state.lastCreated = action.payload;
        /* prepend to list if it isn't already there (socket may have added it) */
        const exists = state.items.some(o => o._id === action.payload._id);
        if (!exists) state.items.unshift(action.payload);
      })
      .addCase(createOrder.rejected,  (state, action)  => { state.loading = false; state.error = action.payload; })
      /* updateOrderStatus */
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const { _id } = action.payload;
        const idx  = state.items.findIndex(o => o._id === _id);
        if (idx  !== -1) state.items[idx]  = action.payload;
        const kidx = state.kitchenOrders.findIndex(o => o._id === _id);
        if (kidx !== -1) state.kitchenOrders[kidx] = action.payload;
      });
  },
});

export const { addSocketOrder, updateSocketOrder, clearLastCreated, clearOrderError } = orderSlice.actions;
export default orderSlice.reducer;
