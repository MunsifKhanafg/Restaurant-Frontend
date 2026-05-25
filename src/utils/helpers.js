const CURRENCY = process.env.REACT_APP_CURRENCY || 'Rs.';

export const formatCurrency = (amount) =>
  `${CURRENCY} ${parseFloat(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (dateString) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (dateString) => {
  const d = new Date(dateString);
  return d.toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatTime = (dateString) => {
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};

export const getStatusColor = (status) => {
  const map = {
    received: 'badge-blue', confirmed: 'badge-gold', preparing: 'badge-orange',
    ready: 'badge-green', delivered: 'badge-green', completed: 'badge-green',
    cancelled: 'badge-red', pending: 'badge-gray', paid: 'badge-green',
    failed: 'badge-red', available: 'badge-green', low: 'badge-orange', finished: 'badge-red',
  };
  return map[status] || 'badge-gray';
};

export const PAYMENT_LABELS = {
  cash: '💵 Cash',
  card: '💳 Card',
  online: '🌐 Online',
  cod: '📦 Cash on Delivery',
  jazzcash: '📱 JazzCash',
  easypaisa: '💚 Easypaisa',
  bankaccount: '🏦 Bank Account',
};

export const getPaymentLabel = (method) => PAYMENT_LABELS[method] || method;

export const generateBillHtml = (order, extras = []) => {
  const restaurantName = order._restaurantName || process.env.REACT_APP_RESTAURANT_NAME || 'My Restaurant';

  // Combine saved bread + any ad-hoc extras passed at print time
  const extraLines = [
    ...(order.breadIncluded && order.breadCharge > 0
      ? [{ name: `🫓 Bread (${order.breadCount || 1} pc)`, amount: order.breadCharge }]
      : []),
    ...extras.filter(e => e.qty > 0).map(e => ({ name: `${e.name} ×${e.qty}`, amount: e.qty * e.price })),
  ];

  const extraTotal = extraLines.reduce((s, e) => s + e.amount, 0);
  const finalTotal = order.totalAmount + extraTotal;

  const items = order.items.map(i =>
    `<tr>
      <td style="padding:6px 0;border-bottom:1px solid #333">${i.name}</td>
      <td style="text-align:center;padding:6px 0;border-bottom:1px solid #333">${i.quantity}</td>
      <td style="text-align:right;padding:6px 0;border-bottom:1px solid #333">${formatCurrency(i.price * i.quantity)}</td>
    </tr>`
  ).join('');

  const extraRows = extraLines.map(e =>
    `<tr>
      <td style="padding:6px 0;border-bottom:1px solid #333;color:#D4AF37">${e.name}</td>
      <td style="text-align:center;padding:6px 0;border-bottom:1px solid #333">—</td>
      <td style="text-align:right;padding:6px 0;border-bottom:1px solid #333;color:#D4AF37">${formatCurrency(e.amount)}</td>
    </tr>`
  ).join('');

  return `
    <!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Bill — ${order.billId}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'DM Sans',sans-serif; background:#0D0D0D; color:#F5F0E8; padding:20px; max-width:380px; margin:auto; }
      .logo { font-family:'Cormorant Garamond',serif; font-size:28px; color:#D4AF37; text-align:center; margin-bottom:4px; }
      .subtitle { text-align:center; color:#888; font-size:11px; letter-spacing:0.15em; text-transform:uppercase; margin-bottom:16px; }
      .divider { border:none; border-top:1px dashed #333; margin:12px 0; }
      .row { display:flex; justify-content:space-between; margin:4px 0; font-size:13px; }
      .label { color:#888; } .value { color:#F5F0E8; }
      table { width:100%; border-collapse:collapse; font-size:13px; margin:8px 0; }
      th { color:#D4AF37; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; text-align:left; padding:6px 0; border-bottom:1px solid #333; }
      .total-row { font-weight:600; font-size:15px; color:#D4AF37; }
      .footer { text-align:center; color:#555; font-size:11px; margin-top:16px; }
      .bill-id { font-family:'JetBrains Mono',monospace; font-size:11px; color:#D4AF37; text-align:center; margin:8px 0; }
    </style></head><body>
    <div class="logo">${restaurantName}</div>
    <div class="subtitle">Official Receipt</div>
    <div class="bill-id">${order.billId}</div>
    <hr class="divider"/>
    <div class="row"><span class="label">Date</span><span class="value">${formatDateTime(order.createdAt)}</span></div>
    <div class="row"><span class="label">Type</span><span class="value" style="text-transform:capitalize">${order.orderType}</span></div>
    ${order.tableNumber ? `<div class="row"><span class="label">Table</span><span class="value">#${order.tableNumber}</span></div>` : ''}
    ${order.customer?.name ? `<div class="row"><span class="label">Customer</span><span class="value">${order.customer.name}</span></div>` : ''}
    <hr class="divider"/>
    <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${items}${extraRows}</tbody></table>
    <hr class="divider"/>
    <div class="row"><span class="label">Subtotal</span><span class="value">${formatCurrency(order.subtotal)}</span></div>
    <div class="row"><span class="label">Tax (${order.taxPercentage}%)</span><span class="value">${formatCurrency(order.taxAmount)}</span></div>
    ${order.discountAmount > 0 ? `<div class="row"><span class="label">Discount</span><span style="color:#4CAF7D">- ${formatCurrency(order.discountAmount)}</span></div>` : ''}
    ${order.deliveryCharge > 0 ? `<div class="row"><span class="label">Delivery</span><span class="value">${formatCurrency(order.deliveryCharge)}</span></div>` : ''}
    ${extraTotal > 0 ? `<div class="row"><span class="label">Extras</span><span class="value">${formatCurrency(extraTotal)}</span></div>` : ''}
    <hr class="divider"/>
    <div class="row total-row"><span>TOTAL</span><span>${formatCurrency(finalTotal)}</span></div>
    <div class="row" style="margin-top:6px"><span class="label">Payment</span><span class="value" style="text-transform:capitalize">${getPaymentLabel(order.paymentMethod)}</span></div>
    <hr class="divider"/>
    <div class="footer">Thank you for dining with us.<br/>Visit again soon!</div>
    </body></html>
  `;
};

export const printBill = (order, extras = []) => {
  const win = window.open('', '_blank', 'width=420,height=700');
  win.document.write(generateBillHtml(order, extras));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
};
