import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { addSocketOrder, updateSocketOrder } from '../store/slices/orderSlice';
import { addNotification } from '../store/slices/uiSlice';
import toast from 'react-hot-toast';

let socketInstance = null;

// Play a soft notification chime using Web Audio API
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, start, duration, gain = 0.3) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    playTone(880, 0, 0.18);
    playTone(1100, 0.2, 0.18);
    playTone(1320, 0.4, 0.25);
  } catch (_) { /* audio not supported */ }
};

export const useSocket = (userRole) => {
  const dispatch = useDispatch();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userRole) return;

    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket'],
    });

    socketRef.current = socket;
    socketInstance = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      if (['chef'].includes(userRole)) socket.emit('joinRoom', 'kitchen');
      if (['admin', 'manager'].includes(userRole)) socket.emit('joinRoom', 'admin');
    });

    socket.on('newOrder', (order) => {
      dispatch(addSocketOrder(order));

      const isManager = ['admin', 'manager'].includes(userRole);

      // Build a rich description
      const typeLabel =
        order.orderType === 'dine-in'
          ? `Table ${order.tableNumber}`
          : order.orderType === 'delivery'
          ? `Delivery — ${order.customer?.name || order.customer?.phone || 'Customer'}`
          : 'Takeaway';

      const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;

      const message = isManager
        ? `🍽️ New Order — ${order.billId} | ${typeLabel} | ${itemCount} item(s)`
        : `🍽️ New Order — ${order.billId}`;

      dispatch(addNotification({
        type: 'order',
        message,
        orderId: order._id,
        billId: order.billId,
        orderType: order.orderType,
        tableNumber: order.tableNumber,
        customerName: order.customer?.name || '',
        itemCount,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
      }));

      // Play sound for managers/admins and kitchen
      if (isManager || userRole === 'chef') {
        playNotificationSound();
      }

      // Show toast
      toast.custom(
        (t) => (
          <div
            onClick={() => toast.dismiss(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: '#1A1A1A', border: '1px solid rgba(212,175,55,0.4)',
              borderRadius: '12px', padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              cursor: 'pointer', maxWidth: '380px', width: '100%',
              animation: t.visible ? 'slideIn 0.3s ease' : 'slideOut 0.3s ease',
            }}
          >
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#D4AF37,#B8960C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>🍽️</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '700', color: '#D4AF37', fontSize: '13px', marginBottom: '2px' }}>
                New Order Received!
              </div>
              <div style={{ color: '#F5F0E8', fontSize: '12px', fontFamily: '"JetBrains Mono",monospace' }}>
                {order.billId}
              </div>
              <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                {typeLabel} • {itemCount} item(s)
                {order.paymentMethod ? ` • ${order.paymentMethod}` : ''}
              </div>
            </div>
            <div style={{
              fontSize: '10px', background: 'rgba(212,175,55,0.15)', color: '#D4AF37',
              padding: '3px 8px', borderRadius: '999px', fontWeight: '700',
              border: '1px solid rgba(212,175,55,0.3)', whiteSpace: 'nowrap',
            }}>NEW</div>
          </div>
        ),
        { duration: 6000, position: 'top-right' }
      );
    });

    socket.on('orderUpdate', (order) => {
      // Admin room: full order updates
      if (['admin', 'manager'].includes(userRole)) {
        dispatch(updateSocketOrder({ orderId: order._id, status: order.orderStatus }));
      }
    });

    socket.on('orderStatusUpdate', (data) => {
      dispatch(updateSocketOrder(data));

      // Notify manager when order status changes
      if (['admin', 'manager'].includes(userRole) && data.status) {
        const statusLabels = {
          confirmed: '✅ Order Confirmed',
          preparing: '👨‍🍳 Now Preparing',
          ready: '🔔 Order Ready!',
          delivered: '🛵 Out for Delivery',
          completed: '🎉 Order Completed',
          cancelled: '❌ Order Cancelled',
        };
        if (statusLabels[data.status]) {
          dispatch(addNotification({
            type: 'status',
            message: `${statusLabels[data.status]} — Order #${data.orderId?.toString().slice(-6).toUpperCase()}`,
          }));
        }
      }
    });

    socket.on('disconnect', () => console.log('🔌 Socket disconnected'));

    return () => { socket.disconnect(); socketInstance = null; };
  }, [userRole, dispatch]);

  return socketRef.current;
};

export const getSocket = () => socketInstance;
