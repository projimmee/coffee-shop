// ===== Coffee Shop Management System =====
// Pure HTML/CSS/JS + localStorage

const STORAGE_KEYS = {
  products: 'coffee_products',
  orders: 'coffee_orders',
  cart: 'coffee_cart',
  adminAuth: 'coffee_admin_auth'
};

const DEFAULT_PRODUCTS = [
  {
    id: 'p1',
    name: 'เอสเปรสโซ่',
    price: 45,
    category: 'กาแฟ',
    description: 'กาแฟเข้มข้นแบบอิตาเลียน',
    image: ''
  },
  {
    id: 'p2',
    name: 'อเมริกาโน่',
    price: 50,
    category: 'กาแฟ',
    description: 'เอสเปรสโซ่ผสมน้ำร้อน หอมเข้ม',
    image: ''
  },
  {
    id: 'p3',
    name: 'คาปูชิโน่',
    price: 60,
    category: 'กาแฟ',
    description: 'นมฟองนุ่ม ๆ กับเอสเปรสโซ่',
    image: ''
  },
  {
    id: 'p4',
    name: 'ลาเต้',
    price: 65,
    category: 'กาแฟ',
    description: 'นมสดละมุน กับกาแฟหอมกรุ่น',
    image: ''
  },
  {
    id: 'p5',
    name: 'มอคค่า',
    price: 70,
    category: 'กาแฟ',
    description: 'ช็อกโกแลต + กาแฟ + นม',
    image: ''
  },
  {
    id: 'p6',
    name: 'ชาเขียวมัทฉะลาเต้',
    price: 75,
    category: 'ชา',
    description: 'มัทฉะญี่ปุ่นแท้ ผสมนม',
    image: ''
  },
  {
    id: 'p7',
    name: 'ชานมไต้หวัน',
    price: 55,
    category: 'ชา',
    description: 'ชานมสูตรไต้หวัน หวานมัน',
    image: ''
  },
  {
    id: 'p8',
    name: 'เค้กช็อกโกแลต',
    price: 85,
    category: 'ของหวาน',
    description: 'เค้กช็อกโกแลตนุ่มฟู',
    image: ''
  },
  {
    id: 'p9',
    name: 'ครัวซองต์เนย',
    price: 50,
    category: 'ของหวาน',
    description: 'ครัวซองต์อบใหม่ กรอบนอกนุ่มใน',
    image: ''
  },
  {
    id: 'p10',
    name: 'น้ำส้มคั้นสด',
    price: 45,
    category: 'เครื่องดื่มอื่นๆ',
    description: 'น้ำส้มคั้นสด ๆ ไม่ใส่น้ำตาล',
    image: ''
  }
];

// ===== Helpers =====
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// หมายเลขออเดอร์รัน 0-999 แล้ววนกลับ
function getNextOrderNumber() {
  let counter = parseInt(localStorage.getItem('coffee_order_counter') || '0', 10);
  const num = counter;
  counter = (counter + 1) % 1000; // 0-999
  localStorage.setItem('coffee_order_counter', String(counter));
  // แสดงเป็น 3 หลัก เช่น 001, 042, 999
  return String(num).padStart(3, '0');
}

function formatPrice(n) {
  return Number(n).toLocaleString('th-TH');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getIcon(category) {
  const icons = {
    'กาแฟ': '☕',
    'ชา': '🍵',
    'ของหวาน': '🍰',
    'เครื่องดื่มอื่นๆ': '🥤'
  };
  return icons[category] || '🍽️';
}

// ===== Storage (localStorage + Firebase) =====
let db = null;
let firebaseReady = false;
let productsCache = null;
let ordersCache = [];

function initFirebase() {
  if (typeof firebase === 'undefined' || typeof USE_FIREBASE === 'undefined' || !USE_FIREBASE) {
    console.log('[Storage] ใช้ localStorage (ยังไม่เปิด Firebase)');
    return false;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    firebaseReady = true;
    console.log('[Storage] เชื่อม Firebase สำเร็จ');
    return true;
  } catch (e) {
    console.error('[Storage] Firebase error:', e);
    firebaseReady = false;
    return false;
  }
}

// --- Products ---
function getProducts() {
  if (productsCache) return productsCache;
  const data = localStorage.getItem(STORAGE_KEYS.products);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(DEFAULT_PRODUCTS));
    productsCache = [...DEFAULT_PRODUCTS];
    return productsCache;
  }
  productsCache = JSON.parse(data);
  return productsCache;
}

async function saveProducts(products) {
  productsCache = products;
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
  if (firebaseReady && db) {
    try {
      // บันทึกทีละชิ้นด้วย id เป็น document id
      const batch = db.batch();
      const col = db.collection('products');
      // ลบของเก่าแล้วเขียนใหม่แบบง่าย (สำหรับร้านเล็ก)
      const snap = await col.get();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      products.forEach(p => {
        batch.set(col.doc(p.id), p);
      });
      await batch.commit();
    } catch (e) {
      console.error('saveProducts Firebase:', e);
    }
  }
}

async function loadProductsFromFirebase() {
  if (!firebaseReady || !db) return getProducts();
  try {
    const snap = await db.collection('products').get();
    if (snap.empty) {
      // ครั้งแรก: seed ข้อมูลเริ่มต้นขึ้น Firebase
      await saveProducts(DEFAULT_PRODUCTS);
      productsCache = [...DEFAULT_PRODUCTS];
      return productsCache;
    }
    const products = snap.docs.map(d => d.data());
    productsCache = products;
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
    return products;
  } catch (e) {
    console.error('loadProductsFromFirebase:', e);
    return getProducts();
  }
}

// --- Orders ---
function getOrders() {
  if (ordersCache && ordersCache.length >= 0 && firebaseReady) return ordersCache;
  const data = localStorage.getItem(STORAGE_KEYS.orders);
  return data ? JSON.parse(data) : [];
}

async function saveOrders(orders) {
  // ใช้เฉพาะ local fallback — Firebase บันทึกทีละ order
  ordersCache = orders;
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
}

async function addOrderToFirebase(order) {
  if (!firebaseReady || !db) {
    const orders = getOrders();
    orders.unshift(order);
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
    ordersCache = orders;
    return;
  }
  try {
    await db.collection('orders').doc(order.id).set(order);
  } catch (e) {
    console.error('addOrderToFirebase:', e);
    // fallback local
    const orders = getOrders();
    orders.unshift(order);
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
  }
}

async function updateOrderInFirebase(orderId, data) {
  if (!firebaseReady || !db) {
    const orders = getOrders();
    const o = orders.find(x => x.id === orderId);
    if (o) Object.assign(o, data);
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
    ordersCache = orders;
    return;
  }
  try {
    await db.collection('orders').doc(orderId).update(data);
  } catch (e) {
    console.error('updateOrderInFirebase:', e);
  }
}

function subscribeOrders(callback) {
  if (!firebaseReady || !db) {
    // local mode: ไม่มี real-time ข้ามเครื่อง
    callback(getOrders());
    return () => {};
  }
  return db.collection('orders')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      const orders = snap.docs.map(d => d.data());
      ordersCache = orders;
      localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
      callback(orders);
    }, err => {
      console.error('subscribeOrders:', err);
    });
}

function subscribeProducts(callback) {
  if (!firebaseReady || !db) {
    callback(getProducts());
    return () => {};
  }
  return db.collection('products').onSnapshot(snap => {
    const products = snap.docs.map(d => d.data());
    productsCache = products;
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
    callback(products);
  }, err => console.error('subscribeProducts:', err));
}

// --- Cart (เก็บ local เสมอ — คนละเครื่องคนละตะกร้า) ---
function getCart() {
  const data = localStorage.getItem(STORAGE_KEYS.cart);
  return data ? JSON.parse(data) : [];
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
}

// ===== Buyer: Products =====
let currentCategory = 'all';

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  let products = getProducts();
  if (currentCategory !== 'all') {
    products = products.filter(p => p.category === currentCategory);
  }

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="icon">☕</div>
        <p>ยังไม่มีสินค้าในหมวดนี้</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="product-image">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" onerror="this.parentElement.innerHTML='${getIcon(p.category)}'">`
          : getIcon(p.category)}
      </div>
      <div class="product-body">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-footer">
          <div class="product-price">${formatPrice(p.price)} ฿</div>
          <button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}')">
            + ใส่ตะกร้า
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderProducts();
    });
  });
}

// ===== Cart =====
// Pending product for note modal
let pendingProduct = null;
let pendingQty = 1;

function addToCart(productId) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  pendingProduct = product;
  pendingQty = 1;

  // Show note modal
  const preview = document.getElementById('note-product-preview');
  if (preview) {
    const icon = getIcon(product.category);
    const imgHtml = product.image
      ? `<img src="${product.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" onerror="this.parentElement.textContent='${icon}'">`
      : icon;
    preview.innerHTML = `
      <div class="np-icon">${imgHtml}</div>
      <div>
        <div class="np-name">${product.name}</div>
        <div class="np-price">${formatPrice(product.price)} ฿</div>
      </div>`;
  }
  document.getElementById('note-qty-value').textContent = '1';
  document.getElementById('item-note').value = '';
  document.querySelectorAll('.quick-tag').forEach(t => t.classList.remove('active'));
  document.getElementById('note-modal')?.classList.add('show');
}

function closeNoteModal() {
  document.getElementById('note-modal')?.classList.remove('show');
  pendingProduct = null;
  pendingQty = 1;
}

function confirmAddToCart() {
  if (!pendingProduct) return;

  const note = (document.getElementById('item-note')?.value || '').trim();
  const qty = pendingQty || 1;

  let cart = getCart();
  // ถ้าสินค้าเดียวกัน + หมายเหตุเดียวกัน ให้รวมจำนวน
  const existing = cart.find(item =>
    item.id === pendingProduct.id && (item.note || '') === note
  );

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: pendingProduct.id,
      name: pendingProduct.name,
      price: pendingProduct.price,
      qty: qty,
      note: note
    });
  }
  saveCart(cart);
  updateCartUI();
  closeNoteModal();
}

function updateCartQty(productId, delta) {
  let cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }
  saveCart(cart);
  updateCartUI();
  renderCartItems();
}

function removeFromCart(productId) {
  let cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
  updateCartUI();
  renderCartItems();
}

function updateCartQtyByIndex(idx, delta) {
  let cart = getCart();
  if (!cart[idx]) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) {
    cart.splice(idx, 1);
  }
  saveCart(cart);
  updateCartUI();
  renderCartItems();
}

function removeFromCartByIndex(idx) {
  let cart = getCart();
  cart.splice(idx, 1);
  saveCart(cart);
  updateCartUI();
  renderCartItems();
}



function updateCartUI() {
  const cart = getCart();
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.textContent = count;

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = formatPrice(total);

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
}

function renderCartItems() {
  const container = document.getElementById('cart-items');
  if (!container) return;

  const cart = getCart();
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🛒</div>
        <p>ตะกร้าว่างเปล่า</p>
      </div>`;
    return;
  }

  container.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        ${item.note ? `<div style="font-size:0.8rem; color:var(--primary-light); margin:0.15rem 0;">📝 ${item.note}</div>` : ''}
        <span>${formatPrice(item.price)} ฿ × ${item.qty} = ${formatPrice(item.price * item.qty)} ฿</span>
      </div>
      <div class="cart-item-actions">
        <button class="qty-btn" onclick="updateCartQtyByIndex(${idx}, -1)">−</button>
        <span>${item.qty}</span>
        <button class="qty-btn" onclick="updateCartQtyByIndex(${idx}, 1)">+</button>
        <button class="btn btn-sm btn-danger" onclick="removeFromCartByIndex(${idx})" style="padding:0.2rem 0.5rem;">ลบ</button>
      </div>
    </div>
  `).join('');
}

function openCart() {
  renderCartItems();
  updateCartUI();
  document.getElementById('cart-modal')?.classList.add('show');
}

function closeCart() {
  document.getElementById('cart-modal')?.classList.remove('show');
}

// ===== Checkout =====
function openCheckout() {
  const cart = getCart();
  if (cart.length === 0) return;

  closeCart();
  const summary = document.getElementById('checkout-summary');
  const totalEl = document.getElementById('checkout-total');
  if (summary) {
    summary.innerHTML = cart.map(i =>
      `<div class="detail-item"><span>${i.name} × ${i.qty}${i.note ? ' <small style="color:var(--text-muted);">(📝 '+i.note+')</small>' : ''}</span><span>${formatPrice(i.price * i.qty)} ฿</span></div>`
    ).join('');
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (totalEl) totalEl.textContent = formatPrice(total);

  document.getElementById('checkout-modal')?.classList.add('show');
}

function closeCheckout() {
  document.getElementById('checkout-modal')?.classList.remove('show');
}

function placeOrder(e) {
  e.preventDefault();
  const cart = getCart();
  if (cart.length === 0) return;

  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();
  const note = document.getElementById('customer-note').value.trim();

  const order = {
    id: getNextOrderNumber(),
    customerName: name,
    customerPhone: phone,
    note: note,
    items: cart.map(i => ({ ...i })),
    total: cart.reduce((s, i) => s + i.price * i.qty, 0),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // บันทึกออเดอร์ (Firebase หรือ local)
  addOrderToFirebase(order).then(() => {
    // clear cart
    saveCart([]);
    updateCartUI();

    closeCheckout();

    // reset form
    document.getElementById('checkout-form')?.reset();

    // เด้งไปหน้าติดตามออเดอร์ทันที
    openTrack();
    const input = document.getElementById('track-order-id');
    if (input) {
      input.value = order.id;
      searchOrder();
    }
  });
}

function closeSuccess() {
  document.getElementById('success-modal')?.classList.remove('show');
}

// ===== Admin =====
function isAdminLoggedIn() {
  return localStorage.getItem(STORAGE_KEYS.adminAuth) === 'true';
}

function loginAdmin() {
  const pw = document.getElementById('admin-password')?.value;
  if (pw === 'admin123') {
    localStorage.setItem(STORAGE_KEYS.adminAuth, 'true');
    showAdminDashboard();
  } else {
    const err = document.getElementById('login-error');
    if (err) {
      err.style.display = 'block';
      setTimeout(() => err.style.display = 'none', 2500);
    }
  }
}

function logoutAdmin() {
  localStorage.removeItem(STORAGE_KEYS.adminAuth);
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-dashboard').style.display = 'none';
  stopOrdersPolling();
}

function showAdminDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';

  initFirebase();

  if (firebaseReady) {
    loadProductsFromFirebase().then(() => {
      renderAdminProducts();
      renderProducts();
    });
    subscribeProducts(() => {
      renderAdminProducts();
    });
    subscribeOrders((orders) => {
      ordersCache = orders;
      renderOrders();
    });
  } else {
    renderOrders();
    renderAdminProducts();
    startRealtimeSync();
    startOrdersPolling();
  }
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = `tab-${btn.dataset.tab}`;
      document.getElementById(tabId)?.classList.add('active');
    });
  });
}

// ===== Orders (Admin) =====
let currentOrderStatus = 'all';

// Track previous order IDs for new-order highlight
let previousOrderIds = new Set();

function updateOrderStats(allOrders) {
  const pending = allOrders.filter(o => o.status === 'pending').length;
  const preparing = allOrders.filter(o => o.status === 'preparing').length;
  const completed = allOrders.filter(o => o.status === 'completed').length;
  const total = allOrders.length;

  const el = (id) => document.getElementById(id);
  if (el('stat-pending')) el('stat-pending').textContent = pending;
  if (el('stat-preparing')) el('stat-preparing').textContent = preparing;
  if (el('stat-completed')) el('stat-completed').textContent = completed;
  if (el('stat-total')) el('stat-total').textContent = total;
}

function updateLastSync() {
  const el = document.getElementById('last-sync');
  if (el) {
    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.textContent = `อัปเดต ${now}`;
  }
}

function renderOrders() {
  const list = document.getElementById('orders-list');
  if (!list) return;

  const allOrders = getOrders();
  updateOrderStats(allOrders);
  updateLastSync();

  let orders = allOrders;
  if (currentOrderStatus !== 'all') {
    orders = orders.filter(o => o.status === currentOrderStatus);
  }

  // Detect new orders for highlight + optional sound
  const currentIds = new Set(allOrders.map(o => o.id));
  const newIds = [...currentIds].filter(id => !previousOrderIds.has(id) && previousOrderIds.size > 0);
  if (newIds.length > 0) {
    tryPlayNewOrderSound();
  }
  previousOrderIds = currentIds;

  if (orders.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>ยังไม่มีออเดอร์${currentOrderStatus !== 'all' ? ' ในสถานะนี้' : ''}</p>
      </div>`;
    return;
  }

  const statusLabel = {
    pending: 'รอทำ',
    preparing: 'กำลังทำ',
    completed: 'สำเร็จ',
    cancelled: 'ยกเลิก'
  };

  list.innerHTML = orders.map(o => {
    const isNew = newIds.includes(o.id);
    const borderClass = o.status === 'pending' ? 'pending-urgent' : (o.status === 'preparing' ? 'preparing-active' : '');
    const newClass = isNew ? 'new-order' : '';
    const itemSummary = o.items.map(i => `${i.name}×${i.qty}${i.note ? ' (📝'+i.note+')' : ''}`).join(', ');

    return `
    <div class="order-card ${borderClass} ${newClass}" data-order-id="${o.id}">
      <div class="order-info">
        <h3>${o.id}${isNew ? ' <span style="color:var(--accent);font-size:0.8rem;">ใหม่!</span>' : ''}</h3>
        <div class="order-meta">
          <span>👤 ${o.customerName}</span>
          <span>📞 ${o.customerPhone}</span>
          <span>🕒 ${formatDate(o.createdAt)}</span>
        </div>
        <div style="margin-top:0.35rem; font-size:0.88rem; color:var(--text-muted);">
          ${itemSummary}
        </div>
        <div style="margin-top:0.45rem;">
          <span class="status-badge status-${o.status}">${statusLabel[o.status] || o.status}</span>
          <strong style="margin-left:0.8rem; color:var(--primary);">${formatPrice(o.total)} ฿</strong>
        </div>
      </div>
      <div class="order-actions">
        ${o.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${o.id}', 'preparing')">เริ่มทำ</button>` : ''}
        ${o.status === 'preparing' ? `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${o.id}', 'completed')">เสร็จแล้ว</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="viewOrderDetail('${o.id}')">รายละเอียด</button>
      </div>
    </div>`;
  }).join('');
}

function tryPlayNewOrderSound() {
  try {
    // Simple beep using Web Audio API
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // ignore if audio not allowed
  }
}

function setupOrderFilters() {
  document.querySelectorAll('.status-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentOrderStatus = btn.dataset.status;
      renderOrders();
    });
  });
}

function viewOrderDetail(orderId) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const statusLabel = {
    pending: 'รอทำ',
    preparing: 'กำลังทำ',
    completed: 'สำเร็จ',
    cancelled: 'ยกเลิก'
  };

  const body = document.getElementById('order-detail-body');
  body.innerHTML = `
    <div class="detail-row"><span>หมายเลข</span><strong>${order.id}</strong></div>
    <div class="detail-row"><span>ลูกค้า</span><strong>${order.customerName}</strong></div>
    <div class="detail-row"><span>เบอร์โทร</span><strong>${order.customerPhone}</strong></div>
    <div class="detail-row"><span>เวลาสั่ง</span><strong>${formatDate(order.createdAt)}</strong></div>
    <div class="detail-row"><span>สถานะ</span>
      <span class="status-badge status-${order.status}">${statusLabel[order.status]}</span>
    </div>
    ${order.note ? `<div class="detail-row"><span>หมายเหตุ</span><strong>${order.note}</strong></div>` : ''}
    
    <div class="detail-items">
      <strong>รายการสินค้า</strong>
      ${order.items.map(i => `
        <div class="detail-item">
          <span>${i.name} × ${i.qty}${i.note ? '<br><small style="color:var(--primary-light);">📝 '+i.note+'</small>' : ''}</span>
          <span>${formatPrice(i.price * i.qty)} ฿</span>
        </div>
      `).join('')}
      <div class="detail-item" style="margin-top:0.5rem; font-weight:700; border-top:1px dashed #ccc; padding-top:0.5rem;">
        <span>รวมทั้งสิ้น</span>
        <span>${formatPrice(order.total)} ฿</span>
      </div>
    </div>

    <div class="status-actions">
      ${order.status !== 'preparing' && order.status !== 'completed' && order.status !== 'cancelled'
        ? `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order.id}', 'preparing')">เริ่มทำ</button>` : ''}
      ${order.status === 'preparing'
        ? `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order.id}', 'completed')">เสร็จแล้ว</button>` : ''}
      ${order.status !== 'completed' && order.status !== 'cancelled'
        ? `<button class="btn btn-outline btn-sm" onclick="updateOrderStatus('${order.id}', 'cancelled')" style="color:var(--danger);border-color:var(--danger);">ยกเลิก</button>` : ''}
    </div>
  `;

  document.getElementById('order-detail-modal')?.classList.add('show');
}

function closeOrderDetail() {
  document.getElementById('order-detail-modal')?.classList.remove('show');
}

function updateOrderStatus(orderId, newStatus) {
  updateOrderInFirebase(orderId, { status: newStatus }).then(() => {
    // อัปเดต cache ทันที
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) order.status = newStatus;
    renderOrders();
    viewOrderDetail(orderId);
  });
}

// ===== Products (Admin) =====
function renderAdminProducts() {
  const list = document.getElementById('admin-product-list');
  if (!list) return;

  const products = getProducts();
  if (products.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>ยังไม่มีสินค้า</p></div>`;
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="admin-product-item">
      <div class="info">
        <div class="thumb">
          ${p.image
            ? `<img src="${p.image}" alt="" onerror="this.parentElement.innerHTML='${getIcon(p.category)}'">`
            : getIcon(p.category)}
        </div>
        <div>
          <div class="name">${p.name}</div>
          <div class="meta">${p.category} · ${formatPrice(p.price)} ฿</div>
        </div>
      </div>
      <div style="display:flex; gap:0.4rem;">
        <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')">แก้ไข</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">ลบ</button>
      </div>
    </div>
  `).join('');
}

function editProduct(id) {
  const products = getProducts();
  const p = products.find(x => x.id === id);
  if (!p) return;

  document.getElementById('edit-id').value = p.id;
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-price').value = p.price;
  document.getElementById('product-category').value = p.category;
  document.getElementById('product-desc').value = p.description || '';
  document.getElementById('product-image').value = p.image || '';
  document.getElementById('form-title').textContent = '✏️ แก้ไขสินค้า';
  document.getElementById('submit-product').textContent = 'บันทึกการแก้ไข';
  document.getElementById('cancel-edit').style.display = 'inline-flex';

  // switch to add tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="add-product"]')?.classList.add('active');
  document.getElementById('tab-add-product')?.classList.add('active');
}

function cancelEdit() {
  document.getElementById('product-form').reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('form-title').textContent = '➕ เพิ่มสินค้าใหม่';
  document.getElementById('submit-product').textContent = 'บันทึกสินค้า';
  document.getElementById('cancel-edit').style.display = 'none';
}

function deleteProduct(id) {
  if (!confirm('ต้องการลบสินค้านี้จริงหรือไม่?')) return;
  let products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
  renderAdminProducts();
  renderProducts(); // update buyer page if open in same browser
}

function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('product-name').value.trim();
  const price = Number(document.getElementById('product-price').value);
  const category = document.getElementById('product-category').value;
  const description = document.getElementById('product-desc').value.trim();
  const image = document.getElementById('product-image').value.trim();

  let products = getProducts();

  if (id) {
    // edit
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], name, price, category, description, image };
    }
  } else {
    // add
    products.push({
      id: generateId('p'),
      name,
      price,
      category,
      description,
      image
    });
  }

  saveProducts(products);
  cancelEdit();
  renderAdminProducts();

  // switch back to products tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="products"]')?.classList.add('active');
  document.getElementById('tab-products')?.classList.add('active');

  alert(id ? 'แก้ไขสินค้าเรียบร้อย' : 'เพิ่มสินค้าเรียบร้อย');
}



// ===== Real-time Sync (no refresh needed) =====
let trackPollingTimer = null;
let ordersPollingTimer = null;

function startRealtimeSync() {
  // Cross-tab sync via storage event
  window.addEventListener('storage', (e) => {
    if (!e.key) return;

    if (e.key === STORAGE_KEYS.orders) {
      // Orders changed in another tab
      if (document.getElementById('orders-list')) {
        renderOrders();
      }
      // If track modal is open and has a result, refresh it
      const trackResult = document.getElementById('track-result');
      const trackInput = document.getElementById('track-order-id');
      if (trackResult && trackResult.style.display !== 'none' && trackInput?.value.trim()) {
        searchOrder();
      }
    }

    if (e.key === STORAGE_KEYS.products) {
      if (document.getElementById('product-grid')) {
        renderProducts();
      }
      if (document.getElementById('admin-product-list')) {
        renderAdminProducts();
      }
    }

    if (e.key === STORAGE_KEYS.cart) {
      updateCartUI();
      if (document.getElementById('cart-modal')?.classList.contains('show')) {
        renderCartItems();
      }
    }
  });
}

function startOrdersPolling() {
  stopOrdersPolling();
  // Light polling every 2s while on admin orders tab (same-tab + reliability)
  ordersPollingTimer = setInterval(() => {
    if (document.getElementById('tab-orders')?.classList.contains('active') ||
        document.getElementById('admin-dashboard')?.style.display !== 'none') {
      renderOrders();
    }
  }, 1500);
}

function stopOrdersPolling() {
  if (ordersPollingTimer) {
    clearInterval(ordersPollingTimer);
    ordersPollingTimer = null;
  }
}

function startTrackPolling() {
  stopTrackPolling();
  // Poll every 2s while track result is visible
  trackPollingTimer = setInterval(() => {
    const trackResult = document.getElementById('track-result');
    const trackInput = document.getElementById('track-order-id');
    if (trackResult && trackResult.style.display !== 'none' && trackInput?.value.trim()) {
      searchOrder();
    }
  }, 1500);
}

function stopTrackPolling() {
  if (trackPollingTimer) {
    clearInterval(trackPollingTimer);
    trackPollingTimer = null;
  }
}


// ===== Track Order (Buyer) =====
function openTrack() {
  document.getElementById('track-order-id').value = '';
  document.getElementById('track-result').style.display = 'none';
  document.getElementById('track-modal')?.classList.add('show');
  startTrackPolling();
}

function closeTrack() {
  document.getElementById('track-modal')?.classList.remove('show');
  stopTrackPolling();
}

function searchOrder() {
  const orderId = document.getElementById('track-order-id')?.value.trim();
  const resultEl = document.getElementById('track-result');
  if (!resultEl) return;

  if (!orderId) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="track-not-found">
        <div class="icon">🔍</div>
        <p>กรุณากรอกหมายเลขออเดอร์</p>
      </div>`;
    return;
  }

  const orders = getOrders();
  const order = orders.find(o => o.id.toLowerCase() === orderId.toLowerCase());

  resultEl.style.display = 'block';

  if (!order) {
    resultEl.innerHTML = `
      <div class="track-not-found">
        <div class="icon">😕</div>
        <p>ไม่พบออเดอร์นี้<br><small>กรุณาตรวจสอบหมายเลขอีกครั้ง</small></p>
      </div>`;
    return;
  }

  const statusMap = {
    pending: {
      icon: '⏳',
      label: 'รอทำ',
      desc: 'ร้านค้ารับออเดอร์แล้ว กำลังเตรียมเริ่มทำ',
      step: 1
    },
    preparing: {
      icon: '👨‍🍳',
      label: 'กำลังทำ',
      desc: 'กำลังชงเครื่องดื่ม / เตรียมสินค้าให้คุณ',
      step: 2
    },
    completed: {
      icon: '✅',
      label: 'เสร็จแล้ว',
      desc: 'ออเดอร์พร้อมแล้ว สามารถมารับได้เลย!',
      step: 3
    },
    cancelled: {
      icon: '❌',
      label: 'ยกเลิก',
      desc: 'ออเดอร์นี้ถูกยกเลิกแล้ว',
      step: 0
    }
  };

  const st = statusMap[order.status] || statusMap.pending;
  const isCancelled = order.status === 'cancelled';

  let timelineHtml = '';
  if (!isCancelled) {
    timelineHtml = `
      <div class="track-timeline">
        <div class="track-step ${st.step >= 1 ? (st.step > 1 ? 'done' : 'active') : ''}">
          <div class="track-step-dot">${st.step > 1 ? '✓' : '1'}</div>
          <div class="track-step-label">รอทำ</div>
        </div>
        <div class="track-step ${st.step >= 2 ? (st.step > 2 ? 'done' : 'active') : ''}">
          <div class="track-step-dot">${st.step > 2 ? '✓' : '2'}</div>
          <div class="track-step-label">กำลังทำ</div>
        </div>
        <div class="track-step ${st.step >= 3 ? 'active' : ''}">
          <div class="track-step-dot">${st.step >= 3 ? '✓' : '3'}</div>
          <div class="track-step-label">เสร็จแล้ว</div>
        </div>
      </div>`;
  }

  const itemsHtml = order.items.map(i =>
    `<div class="track-info-row"><span>${i.name} × ${i.qty}${i.note ? ' <small style="color:var(--primary-light);">(📝 '+i.note+')</small>' : ''}</span><span>${formatPrice(i.price * i.qty)} ฿</span></div>`
  ).join('');

  const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  resultEl.innerHTML = `
    <div class="track-status-card">
      <div class="track-live-badge">🔴 สด · อัปเดต ${now}</div>
      <div class="track-status-icon">${st.icon}</div>
      <div class="track-status-label" style="color: ${isCancelled ? 'var(--danger)' : 'var(--primary)'}">${st.label}</div>
      <div class="track-status-desc">${st.desc}</div>
      ${timelineHtml}
      <div class="track-info-list">
        <div class="track-info-row"><span>หมายเลข</span><strong>${order.id}</strong></div>
        <div class="track-info-row"><span>ลูกค้า</span><strong>${order.customerName}</strong></div>
        <div class="track-info-row"><span>เวลาสั่ง</span><strong>${formatDate(order.createdAt)}</strong></div>
        ${order.note ? `<div class="track-info-row"><span>หมายเหตุ</span><strong>${order.note}</strong></div>` : ''}
        <div style="margin-top:0.6rem; padding-top:0.5rem; border-top:1px dashed var(--border);">
          <strong style="font-size:0.85rem; color:var(--text-muted);">รายการ</strong>
          ${itemsHtml}
          <div class="track-info-row" style="margin-top:0.4rem; font-weight:700;">
            <span>รวม</span><span style="color:var(--primary);">${formatPrice(order.total)} ฿</span>
          </div>
        </div>
      </div>
    </div>`;
}



// ===== Reset ทั้งหมด (ต้องใส่รหัสผ่าน) =====
async function resetAllData() {
  const pw = prompt('กรุณากรอกรหัสผ่านเพื่อรีเซ็ตข้อมูลทั้งหมด:\n(รหัสเดียวกับหน้าผู้ขาย)');
  if (pw === null) return;
  if (pw !== 'admin123') {
    alert('รหัสผ่านไม่ถูกต้อง');
    return;
  }
  if (!confirm('ยืนยันรีเซ็ตทั้งหมด?\n\n- สินค้าจะกลับเป็นค่าเริ่มต้น\n- ออเดอร์ทั้งหมดจะถูกลบ\n- ตะกร้าจะว่าง\n- หมายเลขออเดอร์เริ่มที่ 000 ใหม่')) {
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.products);
  localStorage.removeItem(STORAGE_KEYS.orders);
  localStorage.removeItem(STORAGE_KEYS.cart);
  localStorage.removeItem('coffee_order_counter');
  localStorage.removeItem(STORAGE_KEYS.adminAuth);

  if (firebaseReady && db) {
    try {
      const batch = db.batch();
      const orderSnap = await db.collection('orders').get();
      orderSnap.docs.forEach(d => batch.delete(d.ref));
      const prodSnap = await db.collection('products').get();
      prodSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      await saveProducts(DEFAULT_PRODUCTS);
    } catch (e) {
      console.error('Firebase reset error:', e);
      localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(DEFAULT_PRODUCTS));
    }
  } else {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(DEFAULT_PRODUCTS));
  }

  alert('รีเซ็ตข้อมูลทั้งหมดเรียบร้อยแล้ว');
  location.reload();
}

// ===== Init =====
function initBuyer() {
  initFirebase();

  // โหลดสินค้า + subscribe real-time
  if (firebaseReady) {
    loadProductsFromFirebase().then(() => renderProducts());
    subscribeProducts(() => renderProducts());
    subscribeOrders(() => {
      // อัปเดตหน้าติดตามถ้าเปิดอยู่
      const trackResult = document.getElementById('track-result');
      const trackInput = document.getElementById('track-order-id');
      if (trackResult && trackResult.style.display !== 'none' && trackInput?.value.trim()) {
        searchOrder();
      }
    });
  } else {
    renderProducts();
  }

  setupFilters();
  updateCartUI();

  document.getElementById('cart-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    openCart();
  });
  document.getElementById('close-cart')?.addEventListener('click', closeCart);
  document.getElementById('checkout-btn')?.addEventListener('click', openCheckout);
  document.getElementById('close-checkout')?.addEventListener('click', closeCheckout);
  document.getElementById('checkout-form')?.addEventListener('submit', placeOrder);
  document.getElementById('close-success')?.addEventListener('click', closeSuccess);
  document.getElementById('track-from-success')?.addEventListener('click', () => {
    const oid = document.getElementById('order-id-display')?.textContent || '';
    closeSuccess();
    openTrack();
    const input = document.getElementById('track-order-id');
    if (input) {
      input.value = oid;
      searchOrder();
    }
  });

  // Note modal (add to cart)
  document.getElementById('close-note')?.addEventListener('click', closeNoteModal);
  document.getElementById('confirm-add-cart')?.addEventListener('click', confirmAddToCart);
  document.getElementById('note-qty-minus')?.addEventListener('click', () => {
    if (pendingQty > 1) {
      pendingQty--;
      document.getElementById('note-qty-value').textContent = pendingQty;
    }
  });
  document.getElementById('note-qty-plus')?.addEventListener('click', () => {
    pendingQty++;
    document.getElementById('note-qty-value').textContent = pendingQty;
  });
  document.querySelectorAll('.quick-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const noteInput = document.getElementById('item-note');
      const tagNote = tag.dataset.note;
      if (!noteInput) return;
      // toggle tag
      if (tag.classList.contains('active')) {
        tag.classList.remove('active');
        noteInput.value = noteInput.value.replace(tagNote, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
      } else {
        tag.classList.add('active');
        noteInput.value = noteInput.value ? noteInput.value + ', ' + tagNote : tagNote;
      }
    });
  });

  // Track order
  document.getElementById('track-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    openTrack();
  });
  document.getElementById('close-track')?.addEventListener('click', closeTrack);
  document.getElementById('track-search-btn')?.addEventListener('click', searchOrder);
  document.getElementById('track-order-id')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchOrder();
  });

  // Real-time sync
  startRealtimeSync();

  // close modal on backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
        if (modal.id === 'track-modal') stopTrackPolling();
      }
    });
  });
}

function initAdmin() {
  if (isAdminLoggedIn()) {
    showAdminDashboard();
  }

  document.getElementById('login-btn')?.addEventListener('click', loginAdmin);
  document.getElementById('admin-password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginAdmin();
  });
  document.getElementById('logout-btn')?.addEventListener('click', logoutAdmin);
  document.getElementById('reset-all-btn')?.addEventListener('click', resetAllData);

  setupTabs();
  setupOrderFilters();

  document.getElementById('product-form')?.addEventListener('submit', saveProduct);
  document.getElementById('cancel-edit')?.addEventListener('click', cancelEdit);
  document.getElementById('close-order-detail')?.addEventListener('click', closeOrderDetail);

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('show');
    });
  });
}

// Auto init based on page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-grid')) {
    initBuyer();
  }
  // admin init is called from admin.html
});
