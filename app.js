// ===== Coffee Shop Management System =====
// Pure HTML/CSS/JS + localStorage

const STORAGE_KEYS = {
  products: 'coffee_products',
  orders: 'coffee_orders',
  cart: 'coffee_cart',
  adminAuth: 'coffee_admin_auth',
  promptpay: 'coffee_promptpay'
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

function getUniqueCategories() {
  const products = getProducts();
  const set = new Set();
  products.forEach(p => {
    if (p.category && p.category.trim()) set.add(p.category.trim());
  });
  // เรียงตามชื่อ ไทย/อังกฤษ
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
}

function updateCategoryDatalist() {
  const list = document.getElementById('category-list');
  if (!list) return;
  const cats = getUniqueCategories();
  const defaults = ['กาแฟ', 'ชา', 'ของหวาน', 'เครื่องดื่มอื่นๆ'];
  const all = [...new Set([...defaults, ...cats])];
  list.innerHTML = all.map(c => `<option value="${c}"></option>`).join('');
}

function renderCategoryFilters() {
  const container = document.getElementById('category-filters');
  if (!container) return;

  const cats = getUniqueCategories();
  const current = currentCategory || 'all';

  let html = `<button class="filter-btn ${current === 'all' ? 'active' : ''}" data-category="all">ทั้งหมด</button>`;
  cats.forEach(c => {
    html += `<button class="filter-btn ${current === c ? 'active' : ''}" data-category="${c}">${c}</button>`;
  });
  container.innerHTML = html;

  // re-bind clicks
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderProducts();
    });
  });
}

// ===== Storage (localStorage + Firebase) =====
let db = null;
let storageRef = null;
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
    if (typeof firebase.storage === 'function') {
      storageRef = firebase.storage().ref();
    } else {
      storageRef = null;
      console.warn('[Storage] Firebase Storage SDK ยังไม่โหลด — รูปจะเก็บแบบ local');
    }
    firebaseReady = true;
    console.log('[Storage] เชื่อม Firebase สำเร็จ');
    return true;
  } catch (e) {
    console.error('[Storage] Firebase error:', e);
    firebaseReady = false;
    return false;
  }
}

/** แปลง data URL เป็น Blob */
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const binary = atob(parts[1] || '');
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/**
 * อัปโหลดรูปขึ้น Firebase Storage
 * @param {string} path เช่น products/p1.jpg หรือ settings/promptpay.jpg
 * @param {string} dataUrl data:image/...
 * @returns {Promise<string>} download URL หรือ dataUrl เดิมถ้าอัปโหลดไม่ได้
 */
async function uploadImageToFirebase(path, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl || '';
  if (!firebaseReady || !storageRef) {
    console.log('[Upload] ไม่มี Firebase Storage — เก็บแบบ local');
    return dataUrl;
  }
  try {
    const blob = dataUrlToBlob(dataUrl);
    const ref = storageRef.child(path);
    const snapshot = await ref.put(blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: 'public,max-age=31536000'
    });
    const url = await snapshot.ref.getDownloadURL();
    console.log('[Upload] สำเร็จ:', path);
    return url;
  } catch (e) {
    console.error('[Upload] ล้มเหลว:', path, e);
    alert('อัปโหลดรูปขึ้น Firebase ไม่สำเร็จ\nจะเก็บในเครื่องชั่วคราว\n\n' + (e.message || e));
    return dataUrl;
  }
}

/** ถ้าเป็น data URL ให้ upload แล้วคืน URL, ถ้าเป็น http อยู่แล้วคืนเดิม */
async function ensureRemoteImageUrl(dataUrlOrUrl, storagePath) {
  if (!dataUrlOrUrl) return '';
  if (dataUrlOrUrl.startsWith('http://') || dataUrlOrUrl.startsWith('https://')) {
    return dataUrlOrUrl;
  }
  if (dataUrlOrUrl.startsWith('data:')) {
    return await uploadImageToFirebase(storagePath, dataUrlOrUrl);
  }
  return dataUrlOrUrl;
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

  // อัปเดตปุ่มหมวดหมู่ให้ตรงกับสินค้าปัจจุบัน
  renderCategoryFilters();

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
  // หมวดหมู่ถูก bind ใน renderCategoryFilters แล้ว
  renderCategoryFilters();
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
  const location = document.getElementById('customer-location')?.value.trim() || '';
  const note = document.getElementById('customer-note').value.trim();

  const order = {
    id: getNextOrderNumber(),
    customerName: name,
    customerPhone: phone,
    deliveryLocation: location,
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
    const phoneInput = document.getElementById('track-phone');
    if (input) input.value = order.id;
    if (phoneInput) phoneInput.value = order.customerPhone;
    searchOrder();
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
      updateCategoryDatalist();
      renderProducts();
    });
    subscribeProducts(() => {
      renderAdminProducts();
      updateCategoryDatalist();
    });
    subscribeOrders((orders) => {
      ordersCache = orders;
      renderOrders();
    });
  } else {
    renderOrders();
    renderAdminProducts();
    updateCategoryDatalist();
    startRealtimeSync();
    startOrdersPolling();
  }
  loadPromptPayFromFirebase();
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = `tab-${btn.dataset.tab}`;
      document.getElementById(tabId)?.classList.add('active');
      if (btn.dataset.tab === 'settings') {
        updatePromptPayPreview();
      }
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
  const shipping = allOrders.filter(o => o.status === 'shipping').length;
  const completed = allOrders.filter(o => o.status === 'completed').length;
  const total = allOrders.length;

  const el = (id) => document.getElementById(id);
  if (el('stat-pending')) el('stat-pending').textContent = pending;
  if (el('stat-preparing')) el('stat-preparing').textContent = preparing;
  if (el('stat-shipping')) el('stat-shipping').textContent = shipping;
  if (el('stat-completed')) el('stat-completed').textContent = completed;
  if (el('stat-total')) el('stat-total').textContent = total;
}

const STATUS_LABELS = {
  pending: 'รอทำ',
  preparing: 'กำลังทำ',
  shipping: 'กำลังจัดส่ง',
  completed: 'สำเร็จ',
  cancelled: 'ยกเลิก'
};

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

  list.innerHTML = orders.map(o => {
    const isNew = newIds.includes(o.id);
    const borderClass = o.status === 'pending' ? 'pending-urgent'
      : (o.status === 'preparing' ? 'preparing-active'
      : (o.status === 'shipping' ? 'shipping-active' : ''));
    const newClass = isNew ? 'new-order' : '';
    const itemSummary = o.items.map(i => `${i.name}×${i.qty}${i.note ? ' (📝'+i.note+')' : ''}`).join(', ');

    let actionBtns = '';
    if (o.status === 'pending') {
      actionBtns = `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${o.id}', 'preparing')">เริ่มทำ</button>`;
      actionBtns += `<button class="btn btn-outline btn-sm" onclick="showReceipt('${o.id}')">🧾 ใบเสร็จ</button>`;
    } else if (o.status === 'preparing') {
      actionBtns = `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${o.id}', 'shipping')">จัดส่ง</button>`;
      actionBtns += `<button class="btn btn-outline btn-sm" onclick="showReceipt('${o.id}')">🧾 ใบเสร็จ</button>`;
    } else if (o.status === 'shipping') {
      actionBtns = `<button class="btn btn-primary btn-sm" onclick="completeOrderWithReceipt('${o.id}')">เสร็จแล้ว</button>`;
      actionBtns += `<button class="btn btn-outline btn-sm" onclick="showReceipt('${o.id}')">🧾 ใบเสร็จ</button>`;
    } else if (o.status === 'completed') {
      actionBtns = `<button class="btn btn-outline btn-sm" onclick="showReceipt('${o.id}')">🧾 ใบเสร็จ</button>`;
    }

    return `
    <div class="order-card ${borderClass} ${newClass}" data-order-id="${o.id}">
      <div class="order-info">
        <h3>${o.id}${isNew ? ' <span style="color:var(--accent);font-size:0.8rem;">ใหม่!</span>' : ''}</h3>
        <div class="order-meta">
          <span>👤 ${o.customerName}</span>
          <span>📞 ${o.customerPhone}</span>
          ${o.deliveryLocation ? `<span>📍 ${o.deliveryLocation}</span>` : ''}
          <span>🕒 ${formatDate(o.createdAt)}</span>
        </div>
        <div style="margin-top:0.35rem; font-size:0.88rem; color:var(--text-muted);">
          ${itemSummary}
        </div>
        <div style="margin-top:0.45rem;">
          <span class="status-badge status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span>
          <strong style="margin-left:0.8rem; color:var(--primary);">${formatPrice(o.total)} ฿</strong>
        </div>
      </div>
      <div class="order-actions">
        ${actionBtns}
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

  let actionBtns = '';
  if (order.status === 'pending') {
    actionBtns += `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order.id}', 'preparing')">เริ่มทำ</button>`;
  }
  if (order.status === 'preparing') {
    actionBtns += `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order.id}', 'shipping')">จัดส่ง</button>`;
  }
  if (order.status === 'shipping') {
    actionBtns += `<button class="btn btn-primary btn-sm" onclick="completeOrderWithReceipt('${order.id}')">เสร็จแล้ว</button>`;
  }
  // ปุ่มใบเสร็จใช้ได้ทุสถานะยกเว้นยกเลิก
  if (order.status !== 'cancelled') {
    actionBtns += `<button class="btn btn-outline btn-sm" onclick="showReceipt('${order.id}')">🧾 ใบเสร็จ</button>`;
  }
  if (order.status !== 'completed' && order.status !== 'cancelled') {
    actionBtns += `<button class="btn btn-outline btn-sm" onclick="updateOrderStatus('${order.id}', 'cancelled')" style="color:var(--danger);border-color:var(--danger);">ยกเลิก</button>`;
  }

  const body = document.getElementById('order-detail-body');
  body.innerHTML = `
    <div class="detail-row"><span>หมายเลข</span><strong>${order.id}</strong></div>
    <div class="detail-row"><span>ลูกค้า</span><strong>${order.customerName}</strong></div>
    <div class="detail-row"><span>เบอร์โทร</span><strong>${order.customerPhone}</strong></div>
    ${order.deliveryLocation ? `<div class="detail-row"><span>สถานที่จัดส่ง</span><strong>📍 ${order.deliveryLocation}</strong></div>` : ''}
    <div class="detail-row"><span>เวลาสั่ง</span><strong>${formatDate(order.createdAt)}</strong></div>
    <div class="detail-row"><span>สถานะ</span>
      <span class="status-badge status-${order.status}">${STATUS_LABELS[order.status] || order.status}</span>
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
      ${actionBtns}
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
    // ถ้า modal รายละเอียดเปิดอยู่ ให้อัปเดต
    if (document.getElementById('order-detail-modal')?.classList.contains('show')) {
      viewOrderDetail(orderId);
    }
  });
}

function startOrderAndReceipt(orderId) {
  updateOrderInFirebase(orderId, { status: 'preparing' }).then(() => {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) order.status = 'preparing';
    renderOrders();
    closeOrderDetail();
    showReceipt(orderId);
  });
}

function completeOrderWithReceipt(orderId) {
  updateOrderInFirebase(orderId, { status: 'completed' }).then(() => {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) order.status = 'completed';
    renderOrders();
    closeOrderDetail();
    showReceipt(orderId);
  });
}

function getPromptPayImage() {
  try {
    return localStorage.getItem(STORAGE_KEYS.promptpay) || '';
  } catch (e) {
    console.error('getPromptPayImage:', e);
    return '';
  }
}

async function loadPromptPayFromFirebase() {
  if (!firebaseReady || !db) {
    updatePromptPayPreview();
    return getPromptPayImage();
  }
  try {
    const doc = await db.collection('settings').doc('promptpay').get();
    if (doc.exists && doc.data().imageUrl) {
      const url = doc.data().imageUrl;
      try {
        localStorage.setItem(STORAGE_KEYS.promptpay, url);
      } catch (e) { /* URL สั้น ปกติไม่เต็ม */ }
      updatePromptPayPreview();
      return url;
    }
  } catch (e) {
    console.error('loadPromptPayFromFirebase:', e);
  }
  updatePromptPayPreview();
  return getPromptPayImage();
}

async function savePromptPayImage(dataUrl) {
  let finalUrl = dataUrl || '';

  // อัปโหลดขึ้น Firebase Storage ถ้าเป็น data URL
  if (finalUrl && finalUrl.startsWith('data:') && firebaseReady) {
    finalUrl = await uploadImageToFirebase(
      'settings/promptpay_' + Date.now() + '.jpg',
      finalUrl
    );
  }

  // บันทึก URL ลง Firestore
  if (firebaseReady && db) {
    try {
      if (finalUrl) {
        await db.collection('settings').doc('promptpay').set({
          imageUrl: finalUrl,
          updatedAt: new Date().toISOString()
        });
      } else {
        await db.collection('settings').doc('promptpay').delete().catch(() => {});
      }
    } catch (e) {
      console.error('save promptpay firestore:', e);
    }
  }

  // เก็บใน localStorage (URL สั้น หรือ data URL fallback)
  try {
    if (finalUrl) {
      localStorage.setItem(STORAGE_KEYS.promptpay, finalUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.promptpay);
    }
  } catch (e) {
    console.error('savePromptPayImage localStorage:', e);
    // ถ้าเป็น URL จาก Firebase จะสั้น ไม่น่าเต็ม — ถ้า data URL เต็ม แจ้งเตือน
    if (finalUrl && finalUrl.startsWith('data:')) {
      alert('พื้นที่จัดเก็บในเครื่องเต็ม กรุณาเปิด Firebase เพื่อเก็บรูปออนไลน์');
      return false;
    }
  }
  updatePromptPayPreview();
  return true;
}

function updatePromptPayPreview() {
  const preview = document.getElementById('promptpay-preview');
  const clearBtn = document.getElementById('clear-promptpay-btn');
  const src = getPromptPayImage();
  if (!preview) {
    console.warn('promptpay-preview element not found');
    return;
  }
  if (src) {
    preview.innerHTML = `<img src="${src}" alt="PromptPay QR" style="width:100%;height:100%;object-fit:contain;display:block;">`;
    if (clearBtn) clearBtn.style.display = 'inline-flex';
  } else {
    preview.innerHTML = '<span class="preview-placeholder">ยังไม่มีรูปพร้อมเพย์</span>';
    if (clearBtn) clearBtn.style.display = 'none';
  }
}

function handlePromptPayUpload(e) {
  const input = e.target || document.getElementById('promptpay-file');
  const file = input && input.files && input.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WEBP)');
    input.value = '';
    return;
  }

  // ยอมรับไฟล์ใหญ่ขึ้น แล้วค่อยย่อ
  if (file.size > 5 * 1024 * 1024) {
    alert('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    // ย่อรูป QR ให้ชัดแต่ไม่ใหญ่เกิน (max 400px, quality 0.7)
    compressImageIfNeeded(reader.result, 400, 0.7).then(async src => {
      let finalSrc = src;
      if (src.length > 400000) {
        finalSrc = await compressImageIfNeeded(src, 300, 0.6);
      }
      // แสดงสถานะกำลังอัปโหลด
      const preview = document.getElementById('promptpay-preview');
      if (preview) preview.innerHTML = '<span class="preview-placeholder">กำลังอัปโหลด...</span>';

      const ok = await savePromptPayImage(finalSrc);
      if (ok !== false) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-tab="settings"]')?.classList.add('active');
        document.getElementById('tab-settings')?.classList.add('active');
        updatePromptPayPreview();
        const msg = firebaseReady
          ? 'บันทึกรูปพร้อมเพย์เรียบร้อย (อัปขึ้น Firebase แล้ว)'
          : 'บันทึกรูปพร้อมเพย์ในเครื่องแล้ว\n(เปิด Firebase เพื่อใช้ข้ามเครื่อง)';
        alert(msg);
      }
    }).catch(err => {
      console.error(err);
      alert('ประมวลผลรูปไม่สำเร็จ');
    });
  };
  reader.onerror = () => {
    alert('อ่านไฟล์ไม่สำเร็จ');
    input.value = '';
  };
  reader.readAsDataURL(file);
}

function clearPromptPay() {
  if (!confirm('ลบรูปพร้อมเพย์ใช่หรือไม่?')) return;
  savePromptPayImage('');
  const input = document.getElementById('promptpay-file');
  if (input) input.value = '';
  updatePromptPayPreview();
}

function showReceipt(orderId) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const body = document.getElementById('receipt-body');
  if (!body) return;

  const itemsHtml = order.items.map(i => `
    <tr>
      <td>${i.name}${i.note ? `<br><small>📝 ${i.note}</small>` : ''}</td>
      <td style="text-align:center;">${i.qty}</td>
      <td style="text-align:right;">${formatPrice(i.price)} ฿</td>
      <td style="text-align:right;">${formatPrice(i.price * i.qty)} ฿</td>
    </tr>
  `).join('');

  const promptpay = getPromptPayImage();
  const promptpayHtml = promptpay
    ? `<div class="receipt-promptpay">
         <p>ชำระเงินผ่าน PromptPay</p>
         <img src="${promptpay}" alt="PromptPay QR">
         <p class="promptpay-amount">ยอดชำระ ${formatPrice(order.total)} บาท</p>
       </div>`
    : '';

  body.innerHTML = `
    <div class="receipt-paper" id="receipt-print-area">
      <div class="receipt-header">
        <div class="receipt-logo">☕</div>
        <h2>Coffee Shop</h2>
        <p>ใบเสร็จรับเงิน</p>
      </div>
      <div class="receipt-meta">
        <div><span>เลขที่</span><strong>${order.id}</strong></div>
        <div><span>วันที่</span><strong>${formatDate(order.createdAt)}</strong></div>
        <div><span>ลูกค้า</span><strong>${order.customerName}</strong></div>
        <div><span>เบอร์โทร</span><strong>${order.customerPhone}</strong></div>
        ${order.deliveryLocation ? `<div><span>จัดส่งที่</span><strong>${order.deliveryLocation}</strong></div>` : ''}
        <div><span>สถานะ</span><strong>${STATUS_LABELS[order.status] || order.status}</strong></div>
      </div>
      <table class="receipt-table">
        <thead>
          <tr>
            <th>รายการ</th>
            <th style="text-align:center;">จำนวน</th>
            <th style="text-align:right;">ราคา</th>
            <th style="text-align:right;">รวม</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      ${order.note ? `<div class="receipt-note">หมายเหตุ: ${order.note}</div>` : ''}
      <div class="receipt-total">
        <span>ยอดรวมทั้งสิ้น</span>
        <strong>${formatPrice(order.total)} บาท</strong>
      </div>
      ${promptpayHtml}
      <div class="receipt-footer">
        <p>ขอบคุณที่อุดหนุน ☕</p>
        <p class="receipt-date-print">พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')}</p>
      </div>
    </div>
  `;

  document.getElementById('receipt-modal')?.classList.add('show');
}

function closeReceipt() {
  document.getElementById('receipt-modal')?.classList.remove('show');
}

function printReceipt() {
  const area = document.getElementById('receipt-print-area');
  if (!area) return;
  const printWin = window.open('', '_blank', 'width=400,height=600');
  if (!printWin) {
    // fallback: print current page with CSS
    window.print();
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html>
    <html><head>
      <meta charset="UTF-8">
      <title>ใบเสร็จ</title>
      <style>
        body { font-family: 'Sarabun', sans-serif; padding: 16px; color: #2C1810; }
        .receipt-header { text-align: center; margin-bottom: 16px; border-bottom: 2px dashed #ccc; padding-bottom: 12px; }
        .receipt-logo { font-size: 2rem; }
        .receipt-header h2 { margin: 4px 0; font-size: 1.3rem; }
        .receipt-header p { margin: 0; color: #666; font-size: 0.9rem; }
        .receipt-meta { margin-bottom: 12px; font-size: 0.9rem; }
        .receipt-meta div { display: flex; justify-content: space-between; padding: 3px 0; }
        .receipt-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin: 12px 0; }
        .receipt-table th, .receipt-table td { padding: 6px 4px; border-bottom: 1px solid #eee; }
        .receipt-table th { text-align: left; border-bottom: 2px solid #ccc; }
        .receipt-note { font-size: 0.85rem; color: #666; margin: 8px 0; }
        .receipt-total { display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 700;
          border-top: 2px dashed #ccc; padding-top: 10px; margin-top: 8px; }
        .receipt-footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.85rem; }
        .receipt-date-print { font-size: 0.75rem; margin-top: 4px; }
        .receipt-promptpay { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 2px dashed #ccc; }
        .receipt-promptpay p { margin: 4px 0; font-size: 0.9rem; }
        .receipt-promptpay img { width: 160px; height: 160px; object-fit: contain; margin: 8px 0; }
        .promptpay-amount { font-weight: 700; font-size: 1rem !important; }
        small { color: #888; }
      </style>
    </head><body>
      ${area.innerHTML}
      <script>window.onload = function(){ window.print(); }<\/script>
    </body></html>
  `);
  printWin.document.close();
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

function setImagePreview(src) {
  const preview = document.getElementById('image-preview');
  const clearBtn = document.getElementById('clear-image-btn');
  const hidden = document.getElementById('product-image');
  if (!preview) return;

  if (src) {
    preview.innerHTML = `<img src="${src}" alt="preview" onerror="this.parentElement.innerHTML='<span class=\\'preview-placeholder\\'>🖼️ โหลดรูปไม่ได้</span>'">`;
    if (hidden) hidden.value = src;
    if (clearBtn) clearBtn.style.display = 'inline-flex';
  } else {
    preview.innerHTML = '<span class="preview-placeholder">🖼️ ยังไม่มีรูป</span>';
    if (hidden) hidden.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
  }
}

function clearProductImage() {
  setImagePreview('');
  const fileInput = document.getElementById('product-image-file');
  const urlInput = document.getElementById('product-image-url');
  if (fileInput) fileInput.value = '';
  if (urlInput) urlInput.value = '';
}

function handleImageFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
    e.target.value = '';
    return;
  }

  // จำกัดขนาด ~1.5MB (base64 จะใหญ่ขึ้นอีก ~33%)
  if (file.size > 1.5 * 1024 * 1024) {
    alert('ไฟล์ใหญ่เกินไป (แนะนำไม่เกิน 1.5MB)\nลองย่อรูปก่อนอัปโหลด');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    // ถ้าใหญ่เกินไปหลังแปลง ลองย่อด้วย canvas
    compressImageIfNeeded(dataUrl, 800, 0.75).then(finalSrc => {
      setImagePreview(finalSrc);
      const urlInput = document.getElementById('product-image-url');
      if (urlInput) urlInput.value = ''; // ล้าง URL เมื่ออัปโหลดไฟล์
    });
  };
  reader.onerror = () => {
    alert('อ่านไฟล์ไม่สำเร็จ');
    e.target.value = '';
  };
  reader.readAsDataURL(file);
}

function compressImageIfNeeded(dataUrl, maxWidth, quality) {
  return new Promise(resolve => {
    // ถ้าเล็กอยู่แล้ว ไม่ต้องย่อ
    if (dataUrl.length < 200000) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function handleImageUrlInput() {
  const url = document.getElementById('product-image-url')?.value.trim() || '';
  if (url) {
    setImagePreview(url);
  }
}

function showProductForm(isEdit = false) {
  const wrap = document.getElementById('product-form-wrap');
  if (wrap) wrap.style.display = 'block';
  if (!isEdit) {
    document.getElementById('product-form')?.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('form-title').textContent = '➕ เพิ่มสินค้าใหม่';
    document.getElementById('submit-product').textContent = 'บันทึกสินค้า';
    clearProductImage();
  }
  // เลื่อนไปที่ฟอร์ม
  wrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideProductForm() {
  const wrap = document.getElementById('product-form-wrap');
  if (wrap) wrap.style.display = 'none';
  document.getElementById('product-form')?.reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('form-title').textContent = '➕ เพิ่มสินค้าใหม่';
  document.getElementById('submit-product').textContent = 'บันทึกสินค้า';
  clearProductImage();
}

function editProduct(id) {
  const products = getProducts();
  const p = products.find(x => x.id === id);
  if (!p) return;

  // สลับไปแท็บสินค้า
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="products"]')?.classList.add('active');
  document.getElementById('tab-products')?.classList.add('active');

  document.getElementById('edit-id').value = p.id;
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-price').value = p.price;
  document.getElementById('product-category').value = p.category;
  document.getElementById('product-desc').value = p.description || '';
  document.getElementById('form-title').textContent = '✏️ แก้ไขสินค้า';
  document.getElementById('submit-product').textContent = 'บันทึกการแก้ไข';

  // ตั้งค่ารูป
  const img = p.image || '';
  setImagePreview(img);
  const urlInput = document.getElementById('product-image-url');
  if (urlInput) {
    // ถ้าเป็น URL ภายนอก ใส่ในช่อง URL, ถ้าเป็น data: ปล่อยว่าง
    urlInput.value = img.startsWith('data:') ? '' : img;
  }
  const fileInput = document.getElementById('product-image-file');
  if (fileInput) fileInput.value = '';

  showProductForm(true);
}

function cancelEdit() {
  hideProductForm();
}

function deleteProduct(id) {
  if (!confirm('ต้องการลบสินค้านี้จริงหรือไม่?')) return;
  let products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
  renderAdminProducts();
  updateCategoryDatalist();
  renderProducts(); // update buyer page if open in same browser
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('product-name').value.trim();
  const price = Number(document.getElementById('product-price').value);
  const category = document.getElementById('product-category').value.trim();
  const description = document.getElementById('product-desc').value.trim();

  // รูปจาก hidden (อัปโหลดหรือ URL)
  let image = document.getElementById('product-image')?.value.trim() || '';
  // ถ้ามี URL ใหม่และยังไม่ได้ set จาก file ให้ใช้ URL
  const urlVal = document.getElementById('product-image-url')?.value.trim() || '';
  if (urlVal && !image.startsWith('data:')) {
    image = urlVal;
  }

  if (!category) {
    alert('กรุณาระบุหมวดหมู่สินค้า');
    return;
  }

  const submitBtn = document.getElementById('submit-product');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังบันทึก...';
  }

  try {
    // สร้าง id ก่อน ถ้าเป็นสินค้าใหม่ (เพื่อใช้ path อัปโหลด)
    const productId = id || generateId('p');

    // อัปโหลดรูปขึ้น Firebase ถ้าเป็น data URL
    if (image && image.startsWith('data:')) {
      image = await ensureRemoteImageUrl(image, `products/${productId}_${Date.now()}.jpg`);
    }

    let products = getProducts();

    if (id) {
      const idx = products.findIndex(p => p.id === id);
      if (idx !== -1) {
        products[idx] = { ...products[idx], name, price, category, description, image };
      }
    } else {
      products.push({
        id: productId,
        name,
        price,
        category,
        description,
        image
      });
    }

    await saveProducts(products);
    hideProductForm();
    renderAdminProducts();
    updateCategoryDatalist();
    renderProducts();

    const msg = id ? 'แก้ไขสินค้าเรียบร้อย' : 'เพิ่มสินค้าเรียบร้อย';
    alert(firebaseReady && image && image.startsWith('http')
      ? msg + ' (รูปอัปขึ้น Firebase แล้ว)'
      : msg);
  } catch (err) {
    console.error(err);
    alert('บันทึกสินค้าไม่สำเร็จ');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = id ? 'บันทึกการแก้ไข' : 'บันทึกสินค้า';
    }
  }
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
      const trackPhone = document.getElementById('track-phone');
      if (trackResult && trackResult.style.display !== 'none' &&
          trackInput?.value.trim() && trackPhone?.value.trim()) {
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
    const trackPhone = document.getElementById('track-phone');
    if (trackResult && trackResult.style.display !== 'none' &&
        trackInput?.value.trim() && trackPhone?.value.trim()) {
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
function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function getQueuePosition(order) {
  // นับออเดอร์ที่ยังรอทำ/กำลังทำ/กำลังจัดส่ง และสั่งก่อนออเดอร์นี้
  if (order.status === 'completed' || order.status === 'cancelled') return 0;
  const orders = getOrders();
  const active = orders.filter(o =>
    o.status === 'pending' || o.status === 'preparing' || o.status === 'shipping'
  );
  // เรียงตามเวลาสั่ง (เก่ากว่ามาก่อน)
  active.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const idx = active.findIndex(o => o.id === order.id);
  if (idx === -1) return 0;
  return idx; // 0 = ถึงคิวแล้ว, 1 = เหลือ 1 คิวก่อนหน้า ฯลฯ
}

function openTrack() {
  document.getElementById('track-order-id').value = '';
  const phoneEl = document.getElementById('track-phone');
  if (phoneEl) phoneEl.value = '';
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
  const phone = document.getElementById('track-phone')?.value.trim() || '';
  const resultEl = document.getElementById('track-result');
  if (!resultEl) return;

  if (!orderId || !phone) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="track-not-found">
        <div class="icon">🔍</div>
        <p>กรุณากรอกหมายเลขออเดอร์และเบอร์โทร</p>
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
        <p>ไม่พบออเดอร์นี้<br><small>กรุณาตรวจสอบหมายเลขและเบอร์โทรอีกครั้ง</small></p>
      </div>`;
    return;
  }

  // ตรวจสอบว่าเป็นออเดอร์ของเบอร์นี้จริง
  if (normalizePhone(order.customerPhone) !== normalizePhone(phone)) {
    resultEl.innerHTML = `
      <div class="track-not-found">
        <div class="icon">🔒</div>
        <p>ไม่สามารถดูออเดอร์นี้ได้<br><small>เบอร์โทรไม่ตรงกับที่ใช้สั่งซื้อ</small></p>
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
    shipping: {
      icon: '🛵',
      label: 'กำลังจัดส่ง',
      desc: 'กำลังจัดส่งไปยังจุดที่ระบุ',
      step: 3
    },
    completed: {
      icon: '✅',
      label: 'เสร็จแล้ว',
      desc: 'จัดส่งเรียบร้อย ขอบคุณที่อุดหนุน!',
      step: 4
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
  const isDone = order.status === 'completed' || isCancelled;

  // คำนวณคิว
  const queueAhead = getQueuePosition(order);
  let queueHtml = '';
  if (!isDone) {
    if (order.status === 'shipping') {
      queueHtml = `<div class="queue-badge queue-now">🛵 กำลังจัดส่งถึงคุณ</div>`;
    } else if (queueAhead === 0) {
      queueHtml = `<div class="queue-badge queue-now">🔥 ถึงคิวคุณแล้ว / กำลังทำ</div>`;
    } else {
      queueHtml = `<div class="queue-badge">📋 เหลืออีก <strong>${queueAhead}</strong> คิว</div>`;
    }
  }

  let timelineHtml = '';
  if (!isCancelled) {
    timelineHtml = `
      <div class="track-timeline track-timeline-4">
        <div class="track-step ${st.step >= 1 ? (st.step > 1 ? 'done' : 'active') : ''}">
          <div class="track-step-dot">${st.step > 1 ? '✓' : '1'}</div>
          <div class="track-step-label">รอทำ</div>
        </div>
        <div class="track-step ${st.step >= 2 ? (st.step > 2 ? 'done' : 'active') : ''}">
          <div class="track-step-dot">${st.step > 2 ? '✓' : '2'}</div>
          <div class="track-step-label">กำลังทำ</div>
        </div>
        <div class="track-step ${st.step >= 3 ? (st.step > 3 ? 'done' : 'active') : ''}">
          <div class="track-step-dot">${st.step > 3 ? '✓' : '3'}</div>
          <div class="track-step-label">จัดส่ง</div>
        </div>
        <div class="track-step ${st.step >= 4 ? 'active' : ''}">
          <div class="track-step-dot">${st.step >= 4 ? '✓' : '4'}</div>
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
      ${queueHtml}
      <div class="track-status-icon">${st.icon}</div>
      <div class="track-status-label" style="color: ${isCancelled ? 'var(--danger)' : 'var(--primary)'}">${st.label}</div>
      <div class="track-status-desc">${st.desc}</div>
      ${timelineHtml}
      <div class="track-info-list">
        <div class="track-info-row"><span>หมายเลข</span><strong>${order.id}</strong></div>
        <div class="track-info-row"><span>ลูกค้า</span><strong>${order.customerName}</strong></div>
        ${order.deliveryLocation ? `<div class="track-info-row"><span>สถานที่จัดส่ง</span><strong>📍 ${order.deliveryLocation}</strong></div>` : ''}
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
  const pw = prompt('กรุณากรอกรหัสผ่านเพื่อรีเซ็ตออเดอร์:\n(รหัสเดียวกับหน้าผู้ขาย)');
  if (pw === null) return;
  if (pw !== 'admin123') {
    alert('รหัสผ่านไม่ถูกต้อง');
    return;
  }
  if (!confirm('ยืนยันรีเซ็ตออเดอร์ทั้งหมด?\n\n- ออเดอร์ทั้งหมดจะถูกลบ\n- หมายเลขออเดอร์เริ่มที่ 000 ใหม่\n\n(สินค้าและหมวดหมู่จะไม่ถูกลบ)')) {
    return;
  }

  // ลบเฉพาะออเดอร์ + เคาน์เตอร์ (เก็บสินค้าไว้)
  localStorage.removeItem(STORAGE_KEYS.orders);
  localStorage.removeItem('coffee_order_counter');
  ordersCache = [];

  if (firebaseReady && db) {
    try {
      const batch = db.batch();
      const orderSnap = await db.collection('orders').get();
      orderSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.error('Firebase reset orders error:', e);
    }
  }

  alert('รีเซ็ตออเดอร์เรียบร้อยแล้ว');
  renderOrders();
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
      const trackPhone = document.getElementById('track-phone');
      if (trackResult && trackResult.style.display !== 'none' &&
          trackInput?.value.trim() && trackPhone?.value.trim()) {
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
  document.getElementById('show-add-product-btn')?.addEventListener('click', () => showProductForm(false));
  document.getElementById('product-image-file')?.addEventListener('change', handleImageFileSelect);
  document.getElementById('clear-image-btn')?.addEventListener('click', clearProductImage);
  document.getElementById('product-image-url')?.addEventListener('change', handleImageUrlInput);
  document.getElementById('product-image-url')?.addEventListener('blur', handleImageUrlInput);
  document.getElementById('close-order-detail')?.addEventListener('click', closeOrderDetail);
  document.getElementById('close-receipt')?.addEventListener('click', closeReceipt);
  document.getElementById('close-receipt-btn')?.addEventListener('click', closeReceipt);
  document.getElementById('print-receipt-btn')?.addEventListener('click', printReceipt);
  document.getElementById('promptpay-file')?.addEventListener('change', handlePromptPayUpload);
  document.getElementById('clear-promptpay-btn')?.addEventListener('click', clearPromptPay);
  updatePromptPayPreview();

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
