import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchOverview = createAsyncThunk('analytics/overview', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/analytics/overview');
    return data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchProfit = createAsyncThunk('analytics/profit', async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/analytics/profit', { params });
    return data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchDailyChart = createAsyncThunk('analytics/daily', async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/analytics/charts/daily', { params });
    return data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: { overview: null, profit: null, dailyChart: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverview.fulfilled, (state, action) => { state.overview = action.payload; })
      .addCase(fetchProfit.fulfilled, (state, action) => { state.profit = action.payload; })
      .addCase(fetchDailyChart.fulfilled, (state, action) => { state.dailyChart = action.payload; });
  },
});

export default analyticsSlice.reducer;
