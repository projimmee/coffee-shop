// ===== Coffee Shop Management System =====
// Pure HTML/CSS/JS + Firebase (products/orders/settings)
// ตะกร้าเก็บใน sessionStorage (เฉพาะเครื่องนี้)

const STORAGE_KEYS = {
  cart: 'coffee_cart'
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

// หมายเลขออเดอร์รัน 0-999 — ใช้ Firestore settings/orderCounter เท่านั้น
async function getNextOrderNumber() {
  if (!firebaseReady || !db) {
    throw new Error('ต้องเชื่อม Firebase ก่อนจึงสั่งซื้อได้');
  }
  const ref = db.collection('settings').doc('orderCounter');
  const nextNum = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let current = 0;
    if (snap.exists) {
      current = parseInt(snap.data().value, 10) || 0;
    }
    const next = (current + 1) % 1000;
    tx.set(ref, { value: next, updatedAt: new Date().toISOString() }, { merge: true });
    return current;
  });
  return String(nextNum).padStart(3, '0');
}

function formatPrice(n) {
  return Number(n).toLocaleString('th-TH');
}

/** แสดงข้อความที่อยู่ + ลิงก์แผนที่ (ถ้ามีพิกัด) */
function formatDeliveryLabel(order) {
  const type = order.deliveryType === 'delivery' ? '🛵 จัดส่ง' : '🏪 รับที่ร้าน';
  const loc = order.deliveryLocation || '';
  let maps = '';
  if (order.deliveryLat && order.deliveryLng) {
    const url = `https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}`;
    maps = ` <a href="${url}" target="_blank" rel="noopener" class="maps-link">ดูแผนที่↗</a>`;
  }
  return { type, loc, maps };
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

// ===== Storage (Firebase + memory cache) =====
let db = null;
let storageRef = null;
let firebaseReady = false;
let productsCache = null;
let ordersCache = [];

function updateFirebaseStatusUI(ok, detail) {
  const live = document.getElementById('live-indicator');
  const sync = document.getElementById('last-sync');
  const badge = document.getElementById('firebase-status-badge');
  if (ok) {
    if (live) {
      live.innerHTML = '<span class="live-dot"></span> Firebase สด';
      live.classList.add('is-firebase');
      live.classList.remove('is-local');
    }
    if (sync && detail) sync.textContent = detail;
    if (badge) {
      badge.textContent = '☁ Firebase';
      badge.className = 'firebase-status-badge is-on';
      badge.title = 'เชื่อม Firebase แล้ว ข้อมูลซิงค์ข้ามเครื่อง';
    }
  } else {
    if (live) {
      live.innerHTML = '<span class="live-dot local"></span> รอ Firebase';
      live.classList.add('is-local');
      live.classList.remove('is-firebase');
    }
    if (sync) sync.textContent = detail || 'ยังไม่เชื่อม Firebase';
    if (badge) {
      badge.textContent = '⚠ Offline';
      badge.className = 'firebase-status-badge is-off';
      badge.title = 'ยังไม่เชื่อม Firebase — ต้องเชื่อมเพื่อใช้งาน';
    }
  }
}

function initFirebase() {
  if (typeof firebase === 'undefined' || typeof USE_FIREBASE === 'undefined' || !USE_FIREBASE) {
    console.warn('[Storage] ต้องเปิด USE_FIREBASE = true');
    firebaseReady = false;
    updateFirebaseStatusUI(false, 'ยังไม่เปิด Firebase');
    return false;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();

    // โหลด Firebase Storage
    if (typeof firebase.storage === 'function') {
      try {
        storageRef = firebase.storage().ref();
        console.log('[Storage] Storage bucket:', firebaseConfig.storageBucket);
      } catch (storageErr) {
        console.warn('[Storage] init default bucket ล้มเหลว ลอง appspot.com', storageErr);
        try {
          const altBucket = (firebaseConfig.projectId || 'coffee-shop-900ba') + '.appspot.com';
          storageRef = firebase.app().storage('gs://' + altBucket).ref();
          console.log('[Storage] ใช้ bucket สำรอง:', altBucket);
        } catch (e2) {
          storageRef = null;
          console.error('[Storage] ไม่สามารถเปิด Storage ได้', e2);
        }
      }
    } else {
      storageRef = null;
      console.warn('[Storage] ไม่พบ firebase-storage SDK — ตรวจว่าโหลด firebase-storage-compat.js แล้ว');
    }

    firebaseReady = true;
    console.log('[Storage] เชื่อม Firebase สำเร็จ | project:', firebaseConfig.projectId, '| Storage:', !!storageRef);
    updateFirebaseStatusUI(true, 'เชื่อม Firebase แล้ว');
    return true;
  } catch (e) {
    console.error('[Storage] Firebase error:', e);
    firebaseReady = false;
    updateFirebaseStatusUI(false, 'เชื่อม Firebase ไม่สำเร็จ');
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

function formatStorageError(e) {
  const code = e && (e.code || e.name) || '';
  const msg = (e && e.message) || String(e);
  if (code === 'storage/unauthorized' || /permission|unauthorized/i.test(msg)) {
    return 'ไม่มีสิทธิ์อัปโหลด (Storage Rules)\n\nไปที่ Firebase Console → Storage → Rules\nตั้ง allow read, write: if true; แล้ว Publish';
  }
  if (code === 'storage/canceled') return 'การอัปโหลดถูกยกเลิก';
  if (code === 'storage/retry-limit-exceeded') return 'เครือข่ายไม่เสถียร ลองใหม่อีกครั้ง';
  if (code === 'storage/quota-exceeded') return 'พื้นที่ Storage เต็ม';
  if (/storage is not defined|firebase.storage is not a function/i.test(msg)) {
    return 'ยังไม่ได้โหลด Firebase Storage SDK\nตรวจว่ามีไฟล์ firebase-storage-compat.js ในหน้าเว็บ';
  }
  if (/bucket|not found|404/i.test(msg)) {
    return 'ไม่พบ Storage Bucket\nตรวจว่าเปิด Storage ใน Firebase Console แล้ว\nและ storageBucket ใน config ถูกต้อง';
  }
  return (code ? code + '\n' : '') + msg;
}

/**
 * อัปโหลดรูปขึ้น Firebase Storage
 * @returns {Promise<string>} download URL หรือ dataUrl เดิมถ้าอัปโหลดไม่ได้
 */
async function uploadImageToFirebase(path, dataUrl) {
  // ปิด Firebase Storage ถาวร — เก็บ base64 ใน Firestore เท่านั้น
  console.log('[Upload] ข้าม Firebase Storage (ใช้ base64 ใน DB)');
  return dataUrl || '';
}

async function ensureRemoteImageUrl(dataUrlOrUrl, storagePath) {
  // ไม่เรียก Storage — คืนค่าเดิม (base64 หรือ URL)
  return dataUrlOrUrl || '';
}

// --- Products (Firebase + memory cache) ---
function getProducts() {
  if (productsCache) return productsCache;
  return [...DEFAULT_PRODUCTS];
}

async function saveProducts(products) {
  productsCache = products;
  if (!firebaseReady || !db) {
    console.warn('saveProducts: Firebase ยังไม่พร้อม');
    return;
  }
  try {
    const batch = db.batch();
    const col = db.collection('products');
    const snap = await col.get();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    products.forEach(p => {
      batch.set(col.doc(p.id), p);
    });
    await batch.commit();
  } catch (e) {
    console.error('saveProducts Firebase:', e);
    throw e;
  }
}

async function loadProductsFromFirebase() {
  if (!firebaseReady || !db) {
    productsCache = [...DEFAULT_PRODUCTS];
    return productsCache;
  }
  try {
    const snap = await db.collection('products').get();
    if (snap.empty) {
      await saveProducts(DEFAULT_PRODUCTS);
      productsCache = [...DEFAULT_PRODUCTS];
      return productsCache;
    }
    const products = snap.docs.map(d => d.data());
    productsCache = products;
    return products;
  } catch (e) {
    console.error('loadProductsFromFirebase:', e);
    productsCache = productsCache || [...DEFAULT_PRODUCTS];
    return productsCache;
  }
}

// --- Orders (Firebase + memory cache) ---
function getOrders() {
  return Array.isArray(ordersCache) ? ordersCache : [];
}

async function saveOrders(orders) {
  ordersCache = orders;
}

async function addOrderToFirebase(order) {
  let orders = Array.isArray(ordersCache) ? ordersCache.slice() : [];
  orders = orders.filter(o => o && o.id !== order.id);
  orders.unshift(order);
  ordersCache = orders;

  if (!firebaseReady || !db) {
    throw new Error('ต้องเชื่อม Firebase ก่อนจึงสั่งซื้อได้');
  }
  try {
    await db.collection('orders').doc(order.id).set(order);
  } catch (e) {
    console.error('addOrderToFirebase:', e);
    throw e;
  }
}

async function updateOrderInFirebase(orderId, data) {
  const orders = getOrders();
  const o = orders.find(x => x.id === orderId);
  if (o) Object.assign(o, data);
  ordersCache = orders;

  if (!firebaseReady || !db) {
    console.warn('updateOrderInFirebase: Firebase ยังไม่พร้อม');
    return;
  }
  try {
    await db.collection('orders').doc(orderId).update(data);
  } catch (e) {
    console.error('updateOrderInFirebase:', e);
    throw e;
  }
}

function subscribeOrders(callback) {
  if (!firebaseReady || !db) {
    callback(getOrders());
    return () => {};
  }
  return db.collection('orders')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      const orders = snap.docs.map(d => d.data());
      ordersCache = orders;
      updateFirebaseStatusUI(true, `อัปเดต ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      callback(orders);
    }, err => {
      console.error('subscribeOrders:', err);
      updateFirebaseStatusUI(false, 'ซิงค์ออเดอร์ล้มเหลว — ตรวจ Rules');
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
    callback(products);
  }, err => console.error('subscribeProducts:', err));
}

// --- สถานะร้าน + แบรนด์ร้าน (เปิด/ปิด, ชื่อ, โลโก้, ข้อความ) ---
const DEFAULT_SHOP_BRANDING = {
  name: 'Coffee Shop',
  logo: '☕',
  logoType: 'emoji', // emoji | image
  heroTitle: 'ยินดีต้อนรับสู่ Coffee Shop',
  heroSubtitle: 'กาแฟคุณภาพ หอมกรุ่น ทุกแก้วที่คุณดื่ม',
  closedTitle: 'ร้านปิดชั่วคราว',
  closedMessage: 'ขออภัย ขณะนี้ยังไม่รับออเดอร์ กรุณากลับมาใหม่ภายหลัง',
  footerText: '© 2025 Coffee Shop | ระบบจัดการร้านกาแฟ',
  receiptSubtitle: 'ใบเสร็จรับเงิน',
  loginSubtitle: 'Coffee Shop Admin'
};

let shopClosedCache = false;
let shopBrandingCache = { ...DEFAULT_SHOP_BRANDING };

function isShopClosed() {
  return !!shopClosedCache;
}

function getShopBranding() {
  return { ...DEFAULT_SHOP_BRANDING, ...shopBrandingCache };
}

function applyShopBrandingFromData(data) {
  if (!data || typeof data !== 'object') return;
  if (typeof data.closed === 'boolean') {
    shopClosedCache = data.closed;
  }
  const next = { ...DEFAULT_SHOP_BRANDING };
  if (data.name && String(data.name).trim()) next.name = String(data.name).trim();
  if (data.logo != null && String(data.logo).trim()) next.logo = String(data.logo).trim();
  if (data.logoType === 'image' || data.logoType === 'emoji') next.logoType = data.logoType;
  if (data.heroTitle != null) next.heroTitle = String(data.heroTitle);
  if (data.heroSubtitle != null) next.heroSubtitle = String(data.heroSubtitle);
  if (data.closedTitle != null) next.closedTitle = String(data.closedTitle);
  if (data.closedMessage != null) next.closedMessage = String(data.closedMessage);
  if (data.footerText != null) next.footerText = String(data.footerText);
  if (data.receiptSubtitle != null) next.receiptSubtitle = String(data.receiptSubtitle);
  if (data.loginSubtitle != null) next.loginSubtitle = String(data.loginSubtitle);
  if (next.logo && (next.logo.startsWith('data:') || /^https?:\/\//i.test(next.logo))) {
    next.logoType = 'image';
  }
  shopBrandingCache = next;
}

function applyShopBrandingToUI() {
  const b = getShopBranding();

  document.querySelectorAll('.nav-brand .logo').forEach(el => {
    if (b.logoType === 'image' && b.logo) {
      el.innerHTML = `<img src="${b.logo}" alt="logo" style="width:1.5em;height:1.5em;object-fit:contain;vertical-align:middle;border-radius:6px;">`;
    } else {
      el.textContent = b.logo || '☕';
    }
  });
  document.querySelectorAll('.nav-brand .brand-name').forEach(el => {
    el.textContent = b.name || 'Coffee Shop';
  });

  if (document.getElementById('product-grid')) {
    document.title = `☕ ${b.name} - ร้านกาแฟ`;
  } else if (document.getElementById('admin-dashboard') || document.getElementById('login-screen')) {
    document.title = `👨‍💼 ผู้ขาย - ${b.name}`;
  }

  const heroH1 = document.querySelector('.hero-content h1');
  const heroP = document.querySelector('.hero-content p');
  if (heroH1) heroH1.textContent = b.heroTitle || '';
  if (heroP) heroP.textContent = b.heroSubtitle || '';

  const footerP = document.querySelector('.footer p');
  if (footerP) footerP.textContent = b.footerText || '';

  const loginLogo = document.querySelector('.login-logo');
  if (loginLogo) {
    if (b.logoType === 'image' && b.logo) {
      loginLogo.innerHTML = `<img src="${b.logo}" alt="logo" style="width:2.4em;height:2.4em;object-fit:contain;border-radius:10px;">`;
    } else {
      loginLogo.textContent = b.logo || '☕';
    }
  }
  const loginSubtitle = document.querySelector('.login-subtitle');
  if (loginSubtitle) loginSubtitle.textContent = b.loginSubtitle || `${b.name} Admin`;

  const banner = document.getElementById('shop-closed-banner');
  if (banner) {
    const strong = banner.querySelector('strong');
    const p = banner.querySelector('p');
    if (strong) strong.textContent = b.closedTitle || 'ร้านปิดชั่วคราว';
    if (p) p.textContent = b.closedMessage || '';
  }

  fillShopBrandingForm();
}

function fillShopBrandingForm() {
  const b = getShopBranding();
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val != null ? val : '';
  };
  setVal('shop-name', b.name);
  setVal('shop-logo-emoji', b.logoType === 'image' ? '' : (b.logo || ''));
  setVal('shop-hero-title', b.heroTitle);
  setVal('shop-hero-subtitle', b.heroSubtitle);
  setVal('shop-closed-title', b.closedTitle);
  setVal('shop-closed-message', b.closedMessage);
  setVal('shop-footer-text', b.footerText);
  setVal('shop-receipt-subtitle', b.receiptSubtitle);
  setVal('shop-login-subtitle', b.loginSubtitle);

  const preview = document.getElementById('shop-logo-preview');
  const clearBtn = document.getElementById('clear-shop-logo-btn');
  if (preview) {
    if (b.logoType === 'image' && b.logo) {
      preview.innerHTML = `<img src="${b.logo}" alt="logo" style="width:100%;height:100%;object-fit:contain;display:block;">`;
      if (clearBtn) clearBtn.style.display = 'inline-flex';
    } else {
      preview.innerHTML = `<span class="preview-placeholder" style="font-size:2.2rem;">${b.logo || '☕'}</span>`;
      if (clearBtn) clearBtn.style.display = 'none';
    }
  }
}

async function setShopClosed(closed) {
  shopClosedCache = !!closed;

  if (firebaseReady && db) {
    try {
      await db.collection('settings').doc('shop').set({
        closed: !!closed,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('setShopClosed Firebase:', e);
    }
  }
  updateShopClosedUI();
  updateAdminShopToggleUI();
  if (document.getElementById('product-grid')) {
    renderProducts();
    updateCartUI();
  }
}

async function saveShopBranding(partial) {
  const current = getShopBranding();
  const next = { ...current, ...partial };
  if (next.logo && (String(next.logo).startsWith('data:') || /^https?:\/\//i.test(String(next.logo)))) {
    next.logoType = 'image';
  } else if (partial.logoType) {
    next.logoType = partial.logoType;
  } else if (!next.logoType) {
    next.logoType = 'emoji';
  }
  shopBrandingCache = next;

  if (firebaseReady && db) {
    try {
      await db.collection('settings').doc('shop').set({
        name: next.name,
        logo: next.logo,
        logoType: next.logoType,
        heroTitle: next.heroTitle,
        heroSubtitle: next.heroSubtitle,
        closedTitle: next.closedTitle,
        closedMessage: next.closedMessage,
        footerText: next.footerText,
        receiptSubtitle: next.receiptSubtitle,
        loginSubtitle: next.loginSubtitle,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('saveShopBranding Firebase:', e);
      throw e;
    }
  }
  applyShopBrandingToUI();
  updateShopClosedUI();
  return true;
}

async function loadShopStatusFromFirebase() {
  if (!firebaseReady || !db) {
    applyShopBrandingToUI();
    updateShopClosedUI();
    updateAdminShopToggleUI();
    return isShopClosed();
  }
  try {
    const doc = await db.collection('settings').doc('shop').get();
    if (doc.exists) {
      applyShopBrandingFromData(doc.data());
    }
  } catch (e) {
    console.error('loadShopStatusFromFirebase:', e);
  }
  applyShopBrandingToUI();
  updateShopClosedUI();
  updateAdminShopToggleUI();
  return isShopClosed();
}

function subscribeShopStatus() {
  if (!firebaseReady || !db) return () => {};
  return db.collection('settings').doc('shop').onSnapshot(doc => {
    if (doc.exists) {
      const prevClosed = shopClosedCache;
      applyShopBrandingFromData(doc.data());
      applyShopBrandingToUI();
      updateShopClosedUI();
      updateAdminShopToggleUI();
      if (prevClosed !== shopClosedCache && document.getElementById('product-grid')) {
        renderProducts();
        updateCartUI();
      }
    }
  }, err => console.error('subscribeShopStatus:', err));
}

function updateShopClosedUI() {
  const closed = isShopClosed();
  const b = getShopBranding();
  let banner = document.getElementById('shop-closed-banner');
  if (!banner && document.getElementById('product-grid')) {
    banner = document.createElement('div');
    banner.id = 'shop-closed-banner';
    banner.className = 'shop-closed-banner';
    banner.innerHTML = `
      <div class="shop-closed-inner">
        <span class="shop-closed-icon">🔒</span>
        <div>
          <strong>${b.closedTitle || 'ร้านปิดชั่วคราว'}</strong>
          <p>${b.closedMessage || 'ขออภัย ขณะนี้ยังไม่รับออเดอร์ กรุณากลับมาใหม่ภายหลัง'}</p>
        </div>
      </div>`;
    const hero = document.querySelector('.hero');
    if (hero && hero.parentNode) {
      hero.parentNode.insertBefore(banner, hero.nextSibling);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
  } else if (banner) {
    const strong = banner.querySelector('strong');
    const p = banner.querySelector('p');
    if (strong) strong.textContent = b.closedTitle || 'ร้านปิดชั่วคราว';
    if (p) p.textContent = b.closedMessage || '';
  }
  if (banner) {
    banner.style.display = closed ? 'block' : 'none';
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    if (closed) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'ร้านปิด — ยังไม่รับออเดอร์';
    } else {
      const cart = getCart();
      checkoutBtn.disabled = cart.length === 0;
      checkoutBtn.textContent = 'ยืนยันการสั่งซื้อ';
    }
  }

  document.querySelectorAll('.product-card:not(.sold-out) .product-footer .btn-primary').forEach(btn => {
    if (closed) {
      btn.disabled = true;
      btn.classList.add('btn-shop-closed');
      btn.textContent = 'ร้านปิด';
      btn.onclick = (e) => { e.preventDefault(); alert((b.closedTitle || 'ร้านปิดชั่วคราว') + ' — ยังไม่รับออเดอร์'); };
    }
  });
  if (!closed && document.getElementById('product-grid')) {
    // no-op
  }
}

function updateAdminShopToggleUI() {
  const btn = document.getElementById('toggle-shop-btn');
  const status = document.getElementById('shop-status-text');
  if (!btn && !status) return;
  const closed = isShopClosed();
  if (status) {
    status.textContent = closed ? 'สถานะ: ปิดร้าน' : 'สถานะ: เปิดร้าน';
    status.className = closed ? 'shop-status closed' : 'shop-status open';
  }
  if (btn) {
    btn.textContent = closed ? '🟢 เปิดร้าน' : '🔒 ปิดร้าน';
    btn.className = closed ? 'btn btn-primary btn-block' : 'btn btn-danger btn-block';
  }
}

async function toggleShopClosed() {
  const next = !isShopClosed();
  const msg = next
    ? 'ยืนยันปิดร้าน?\nลูกค้าจะไม่สามารถสั่งซื้อได้'
    : 'ยืนยันเปิดร้าน?\nลูกค้าจะสั่งซื้อได้อีกครั้ง';
  if (!confirm(msg)) return;
  await setShopClosed(next);
  alert(next ? 'ปิดร้านแล้ว' : 'เปิดร้านแล้ว');
}

async function handleSaveShopBranding(e) {
  e.preventDefault();
  const name = (document.getElementById('shop-name')?.value || '').trim();
  if (!name) {
    alert('กรุณากรอกชื่อร้าน');
    return;
  }
  const emoji = (document.getElementById('shop-logo-emoji')?.value || '').trim();
  const current = getShopBranding();
  let logo = current.logo;
  let logoType = current.logoType;

  if (emoji) {
    logo = emoji;
    logoType = 'emoji';
  }

  const payload = {
    name,
    logo,
    logoType,
    heroTitle: (document.getElementById('shop-hero-title')?.value || '').trim(),
    heroSubtitle: (document.getElementById('shop-hero-subtitle')?.value || '').trim(),
    closedTitle: (document.getElementById('shop-closed-title')?.value || '').trim(),
    closedMessage: (document.getElementById('shop-closed-message')?.value || '').trim(),
    footerText: (document.getElementById('shop-footer-text')?.value || '').trim(),
    receiptSubtitle: (document.getElementById('shop-receipt-subtitle')?.value || '').trim(),
    loginSubtitle: (document.getElementById('shop-login-subtitle')?.value || '').trim()
  };

  const msgEl = document.getElementById('shop-branding-msg');
  const btn = document.getElementById('save-shop-branding-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';
  }
  try {
    await saveShopBranding(payload);
    if (msgEl) {
      msgEl.style.display = 'block';
      msgEl.className = 'form-msg is-ok';
      msgEl.textContent = 'บันทึกข้อมูลร้านเรียบร้อยแล้ว';
      setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
    } else {
      alert('บันทึกข้อมูลร้านเรียบร้อยแล้ว');
    }
  } catch (err) {
    console.error(err);
    if (msgEl) {
      msgEl.style.display = 'block';
      msgEl.className = 'form-msg is-err';
      msgEl.textContent = 'บันทึกไม่สำเร็จ: ' + (err.message || err);
    } else {
      alert('บันทึกไม่สำเร็จ');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'บันทึกข้อมูลร้าน';
    }
  }
}

function handleShopLogoFile(e) {
  const input = e.target || document.getElementById('shop-logo-file');
  const file = input && input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('กรุณาเลือกไฟล์รูปภาพ');
    input.value = '';
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    alert('ไฟล์ใหญ่เกินไป (สูงสุด 3MB)');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    compressImageIfNeeded(reader.result, 256, 0.8).then(async src => {
      try {
        await saveShopBranding({ logo: src, logoType: 'image' });
        const emojiInput = document.getElementById('shop-logo-emoji');
        if (emojiInput) emojiInput.value = '';
        alert('อัปโหลดโลโก้ร้านเรียบร้อย');
      } catch (err) {
        alert('บันทึกลogo ไม่สำเร็จ');
      }
    }).catch(() => alert('ประมวลผลรูปไม่สำเร็จ'));
  };
  reader.onerror = () => alert('อ่านไฟล์ไม่สำเร็จ');
  reader.readAsDataURL(file);
}

async function clearShopLogoImage() {
  if (!confirm('ลบรูปโลโก้ แล้วกลับไปใช้ emoji เริ่มต้น?')) return;
  const emoji = (document.getElementById('shop-logo-emoji')?.value || '').trim() || '☕';
  await saveShopBranding({ logo: emoji, logoType: 'emoji' });
  const input = document.getElementById('shop-logo-file');
  if (input) input.value = '';
}

// --- Cart (sessionStorage — คนละเครื่องคนละตะกร้า) ---
function getCart() {
  try {
    const data = sessionStorage.getItem(STORAGE_KEYS.cart);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
  } catch (e) {
    console.warn('saveCart failed:', e);
  }
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

  grid.innerHTML = products.map(p => {
    const soldOut = !!p.outOfStock;
    return `
    <div class="product-card ${soldOut ? 'sold-out' : ''}">
      <div class="product-image">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" onerror="this.parentElement.innerHTML='${getIcon(p.category)}'">`
          : getIcon(p.category)}
        ${soldOut ? '<div class="sold-out-badge">หมด</div>' : ''}
      </div>
      <div class="product-body">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}${soldOut ? ' <span class="sold-out-label">สินค้าหมด</span>' : ''}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-footer">
          <div class="product-price">${formatPrice(p.price)} ฿</div>
          ${soldOut
            ? `<button class="btn btn-sm btn-sold-out" disabled>หมดชั่วคราว</button>`
            : (isShopClosed()
              ? `<button class="btn btn-sm btn-sold-out" disabled>ร้านปิด</button>`
              : `<button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}')">+ ใส่ตะกร้า</button>`)}
        </div>
      </div>
    </div>`;
  }).join('');
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
  if (isShopClosed()) {
    alert('ร้านปิดชั่วคราว\nยังไม่สามารถสั่งซื้อได้ในขณะนี้');
    return;
  }
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;
  if (product.outOfStock) {
    alert('สินค้านี้หมดชั่วคราว ไม่สามารถสั่งซื้อได้');
    return;
  }

  pendingProduct = product;
  pendingQty = 1;

  // Show note modal
  const preview = document.getElementById('note-product-preview');
  if (preview) {
    const icon = getIcon(product.category);
    const imgHtml = product.image
      ? `<img src="${product.image}" style="width:100%;height:100%;object-fit:contain;border-radius:12px;" onerror="this.parentElement.textContent='${icon}'">`
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
  if (checkoutBtn) {
    if (isShopClosed()) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'ร้านปิด — ยังไม่รับออเดอร์';
    } else {
      checkoutBtn.disabled = cart.length === 0;
      checkoutBtn.textContent = 'ยืนยันการสั่งซื้อ';
    }
  }
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
function setDeliveryType(type) {
  const hidden = document.getElementById('delivery-type');
  if (hidden) hidden.value = type;

  document.querySelectorAll('.delivery-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  const pickupTimeGroup = document.getElementById('pickup-time-group');
  const pickupTimeInput = document.getElementById('pickup-time');
  const pickupLocGroup = document.getElementById('pickup-location-group');
  const deliveryLocGroup = document.getElementById('delivery-location-group');
  const locInput = document.getElementById('customer-location');

  if (type === 'pickup') {
    // แสดงเวลารับ + จุดรับที่ร้าน
    if (pickupTimeGroup) pickupTimeGroup.style.display = 'block';
    if (pickupLocGroup) pickupLocGroup.style.display = 'block';
    if (deliveryLocGroup) deliveryLocGroup.style.display = 'none';
    if (pickupTimeInput) {
      pickupTimeInput.required = true;
      if (!pickupTimeInput.value) setPickupTimeFromNow(15);
    }
    if (locInput) locInput.required = false;
    clearPinnedLocation();
  } else {
    // บริการจัดส่ง: GPS หรือพิมพ์ที่อยู่
    if (pickupTimeGroup) pickupTimeGroup.style.display = 'none';
    if (pickupLocGroup) pickupLocGroup.style.display = 'none';
    if (deliveryLocGroup) deliveryLocGroup.style.display = 'block';
    if (pickupTimeInput) {
      pickupTimeInput.required = false;
      pickupTimeInput.value = '';
    }
    if (locInput) locInput.required = false; // ไม่บังคับถ้ามี GPS
  }
}

/** ตั้งค่า input type=time จากเวลาปัจจุบัน + นาที */
function setPickupTimeFromNow(extraMins) {
  const input = document.getElementById('pickup-time');
  if (!input) return;
  const d = new Date();
  d.setMinutes(d.getMinutes() + (Number(extraMins) || 0));
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  input.value = `${hh}:${mm}`;
}

function formatPickupTime(t) {
  if (!t) return '';
  // ค่าจาก input type=time เป็น HH:MM
  const parts = String(t).split(':');
  if (parts.length < 2) return t;
  return `${parts[0]}:${parts[1]} น.`;
}

function clearPinnedLocation() {
  const latEl = document.getElementById('delivery-lat');
  const lngEl = document.getElementById('delivery-lng');
  const info = document.getElementById('pinned-location-info');
  const coordsText = document.getElementById('pinned-coords-text');
  const mapsLink = document.getElementById('open-maps-link');
  if (latEl) latEl.value = '';
  if (lngEl) lngEl.value = '';
  if (info) info.style.display = 'none';
  if (coordsText) coordsText.textContent = '';
  if (mapsLink) mapsLink.href = '#';
}

function applyPinnedLocation(lat, lng, addressText) {
  const latEl = document.getElementById('delivery-lat');
  const lngEl = document.getElementById('delivery-lng');
  const info = document.getElementById('pinned-location-info');
  const coordsText = document.getElementById('pinned-coords-text');
  const mapsLink = document.getElementById('open-maps-link');
  const locInput = document.getElementById('customer-location');

  if (latEl) latEl.value = String(lat);
  if (lngEl) lngEl.value = String(lng);

  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  if (mapsLink) {
    mapsLink.href = mapsUrl;
    mapsLink.style.display = 'inline';
  }
  if (coordsText) {
    coordsText.textContent = `📍 ปักหมุดแล้ว (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`;
  }
  if (info) info.style.display = 'block';

  if (addressText && locInput && !locInput.value.trim()) {
    locInput.value = addressText;
  }
}

/** ขอตำแหน่งปัจจุบัน → บันทึกหมุด + เปิด Google Maps */
function pinLocationOnMaps() {
  const btn = document.getElementById('pin-location-btn');
  if (!navigator.geolocation) {
    // ไม่รองรับ GPS — เปิด Google Maps ให้เลือกเอง
    window.open('https://www.google.com/maps', '_blank', 'noopener');
    alert('อุปกรณ์นี้ไม่รองรับ GPS\nเปิด Google Maps แล้วคัดลอกลิงก์หรือที่อยู่กลับมากรอกในช่องด้านบน');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'กำลังหาตำแหน่ง...';
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      let addressText = '';

      // ลองแปลงพิกัดเป็นที่อยู่ (OpenStreetMap — ไม่ต้องใช้ API key)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th`,
          { headers: { 'Accept': 'application/json' } }
        );
        if (res.ok) {
          const data = await res.json();
          addressText = data.display_name || '';
        }
      } catch (err) {
        console.warn('reverse geocode:', err);
      }

      applyPinnedLocation(lat, lng, addressText);

      // เปิด Google Maps ที่จุดปักหมุด (แอปหรือเว็บ)
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(mapsUrl, '_blank', 'noopener');

      if (btn) {
        btn.disabled = false;
        btn.textContent = '📍 ปักหมุดที่อยู่บนแผนที่';
      }
    },
    (err) => {
      console.warn('geolocation error:', err);
      // เปิด Google Maps ให้เลือกเอง
      window.open('https://www.google.com/maps', '_blank', 'noopener');
      alert('ไม่สามารถอ่านตำแหน่งได้\nจะเปิด Google Maps ให้ — เลือกจุดแล้วคัดลอกที่อยู่กลับมากรอก\n\nหรืออนุญาตการเข้าถึงตำแหน่งแล้วลองใหม่');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '📍 ปักหมุดที่อยู่บนแผนที่';
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

function openCheckout() {
  if (isShopClosed()) {
    alert('ร้านปิดชั่วคราว\nยังไม่สามารถสั่งซื้อได้ในขณะนี้');
    return;
  }
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

  // รีเซ็ตวิธีรับสินค้าเป็นรับที่ร้าน
  setDeliveryType('pickup');
  clearPinnedLocation();
  const pickupLoc = document.getElementById('pickup-location');
  if (pickupLoc) pickupLoc.value = '';
  const locInput = document.getElementById('customer-location');
  if (locInput) locInput.value = '';

  document.getElementById('checkout-modal')?.classList.add('show');
}

function closeCheckout() {
  document.getElementById('checkout-modal')?.classList.remove('show');
}

async function placeOrder(e) {
  e.preventDefault();
  if (isShopClosed()) {
    alert('ร้านปิดชั่วคราว\nยังไม่สามารถสั่งซื้อได้ในขณะนี้');
    return;
  }
  let cart = getCart();
  if (cart.length === 0) return;

  // กันสั่งสินค้าที่เพิ่งถูกตั้งหมด
  const products = getProducts();
  const soldOutInCart = cart.filter(item => {
    const p = products.find(x => x.id === item.id);
    return p && p.outOfStock;
  });
  if (soldOutInCart.length > 0) {
    const names = soldOutInCart.map(i => i.name).join(', ');
    alert('มีสินค้าหมดในตะกร้า: ' + names + '\nกรุณาลบออกก่อนสั่งซื้อ');
    // ลบสินค้าหมดออกจากตะกร้าอัตโนมัติ
    cart = cart.filter(item => {
      const p = products.find(x => x.id === item.id);
      return !(p && p.outOfStock);
    });
    saveCart(cart);
    updateCartUI();
    renderCartItems();
    if (cart.length === 0) {
      closeCheckout();
      return;
    }
  }

  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();
  const deliveryType = document.getElementById('delivery-type')?.value || 'pickup';
  const note = document.getElementById('customer-note').value.trim();
  const lat = document.getElementById('delivery-lat')?.value || '';
  const lng = document.getElementById('delivery-lng')?.value || '';
  const pickupTime = document.getElementById('pickup-time')?.value || '';
  let location = '';

  if (deliveryType === 'pickup') {
    // รับที่ร้าน → ต้องมีเวลารับ
    if (!pickupTime) {
      alert('กรุณาระบุเวลารับสินค้า');
      document.getElementById('pickup-time')?.focus();
      return;
    }
    const pickupLoc = document.getElementById('pickup-location')?.value.trim() || '';
    location = pickupLoc || 'รับที่ร้าน';
  } else {
    // บริการส่ง → เลือกอย่างใดอย่างหนึ่ง: GPS หรือพิมพ์ที่อยู่
    location = document.getElementById('customer-location')?.value.trim() || '';
    const hasGps = !!(lat && lng);
    if (!hasGps && !location) {
      alert('กรุณาเลือกอย่างใดอย่างหนึ่ง\n\n① กดปักหมุด GPS\nหรือ\n② พิมพ์ที่อยู่จัดส่ง');
      return;
    }
    if (!location && hasGps) {
      location = `พิกัด ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
    }
  }

  const submitBtn = document.querySelector('#checkout-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังบันทึก...';
  }

  try {
    const orderId = await getNextOrderNumber();
    const order = {
      id: orderId,
      customerName: name,
      customerPhone: phone,
      customerPhoneNorm: normalizePhone(phone),
      deliveryType: deliveryType, // pickup | delivery
      deliveryLocation: location,
      deliveryLat: lat ? Number(lat) : null,
      deliveryLng: lng ? Number(lng) : null,
      pickupTime: deliveryType === 'pickup' ? pickupTime : null,
      note: note,
      items: cart.map(i => ({ ...i })),
      total: cart.reduce((s, i) => s + i.price * i.qty, 0),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await addOrderToFirebase(order);
    saveCart([]);
    updateCartUI();
    closeCheckout();
    document.getElementById('checkout-form')?.reset();
    clearPinnedLocation();
    setDeliveryType('pickup');

    openTrack();
    const phoneInput = document.getElementById('track-phone');
    if (phoneInput) phoneInput.value = order.customerPhone;
    searchOrder();
  } catch (err) {
    console.error('placeOrder error:', err);
    alert('บันทึกออเดอร์ไม่สำเร็จ\n' + (err && err.message ? err.message : 'ลองใหม่อีกครั้ง'));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'ยืนยันสั่งซื้อ';
    }
  }
}

function closeSuccess() {
  document.getElementById('success-modal')?.classList.remove('show');
}

// ===== Admin Auth =====
const DEFAULT_ADMIN = { username: 'admin', password: 'admin123' };
const SESSION_KEY = 'coffee_admin_session';
const FAIL_KEY = 'coffee_admin_fail';
const MAX_FAIL = 5;
const LOCK_MS = 60 * 1000;
const SESSION_MS_SHORT = 8 * 60 * 60 * 1000;
const SESSION_MS_LONG = 7 * 24 * 60 * 60 * 1000;

let adminCredsCache = null;

async function hashPassword(text) {
  const enc = new TextEncoder().encode(String(text));
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getDefaultPasswordHash() {
  return hashPassword(DEFAULT_ADMIN.password);
}

async function loadAdminCreds() {
  if (adminCredsCache) return adminCredsCache;
  if (firebaseReady && db) {
    try {
      const doc = await db.collection('settings').doc('admin').get();
      if (doc.exists && doc.data().username && doc.data().passwordHash) {
        adminCredsCache = {
          username: String(doc.data().username).trim(),
          passwordHash: String(doc.data().passwordHash)
        };
        return adminCredsCache;
      }
    } catch (e) {
      console.warn('loadAdminCreds:', e);
    }
  }
  adminCredsCache = {
    username: DEFAULT_ADMIN.username,
    passwordHash: await getDefaultPasswordHash()
  };
  return adminCredsCache;
}

async function saveAdminCreds(username, passwordPlain) {
  const passwordHash = await hashPassword(passwordPlain);
  adminCredsCache = { username: String(username).trim(), passwordHash };
  if (firebaseReady && db) {
    await db.collection('settings').doc('admin').set({
      username: adminCredsCache.username,
      passwordHash,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
  return adminCredsCache;
}

function getFailState() {
  try {
    const raw = sessionStorage.getItem(FAIL_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  } catch (e) {
    return { count: 0, lockedUntil: 0 };
  }
}

function setFailState(state) {
  try { sessionStorage.setItem(FAIL_KEY, JSON.stringify(state)); } catch (e) {}
}

function clearFailState() {
  try { sessionStorage.removeItem(FAIL_KEY); } catch (e) {}
}

function readSession() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (!raw) continue;
      const s = JSON.parse(raw);
      if (s && s.ok && s.exp && Date.now() < s.exp) return { ...s, store };
      store.removeItem(SESSION_KEY);
    } catch (e) {}
  }
  return null;
}

function writeSession(username, remember) {
  const exp = Date.now() + (remember ? SESSION_MS_LONG : SESSION_MS_SHORT);
  const payload = JSON.stringify({ ok: true, username, exp, at: Date.now() });
  try {
    if (remember) {
      localStorage.setItem(SESSION_KEY, payload);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, payload);
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) { console.warn('writeSession:', e); }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

function isAdminLoggedIn() {
  return !!readSession();
}

function getLoggedInUsername() {
  const s = readSession();
  return s ? s.username : '';
}

function showLoginError(msg) {
  const err = document.getElementById('login-error');
  if (!err) return;
  err.textContent = msg;
  err.style.display = 'block';
}

function hideLoginError() {
  const err = document.getElementById('login-error');
  if (err) err.style.display = 'none';
}

function setLoginLoading(loading) {
  const btn = document.getElementById('login-btn');
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ';
}

async function loginAdmin(e) {
  if (e) e.preventDefault();
  hideLoginError();

  const fail = getFailState();
  if (fail.lockedUntil && Date.now() < fail.lockedUntil) {
    const sec = Math.ceil((fail.lockedUntil - Date.now()) / 1000);
    showLoginError(`ลองผิดหลายครั้ง รออีก ${sec} วินาที`);
    return;
  }

  const username = (document.getElementById('admin-username')?.value || '').trim();
  const password = document.getElementById('admin-password')?.value || '';
  const remember = !!document.getElementById('remember-me')?.checked;

  if (!username || !password) {
    showLoginError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    return;
  }

  setLoginLoading(true);
  try {
    if (!firebaseReady) initFirebase();
    const creds = await loadAdminCreds();
    const hash = await hashPassword(password);

    if (username === creds.username && hash === creds.passwordHash) {
      clearFailState();
      writeSession(username, remember);
      const pwEl = document.getElementById('admin-password');
      if (pwEl) pwEl.value = '';
      showAdminDashboard();
      return;
    }

    const next = { count: (fail.count || 0) + 1, lockedUntil: 0 };
    if (next.count >= MAX_FAIL) {
      next.lockedUntil = Date.now() + LOCK_MS;
      next.count = 0;
      setFailState(next);
      showLoginError(`รหัสผ่านไม่ถูกต้อง ล็อกชั่วคราว ${LOCK_MS / 1000} วินาที`);
    } else {
      setFailState(next);
      showLoginError(`ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (เหลือ ${MAX_FAIL - next.count} ครั้ง)`);
    }
  } catch (err) {
    console.error('loginAdmin:', err);
    showLoginError('เกิดข้อผิดพลาด กรุณาลองใหม่');
  } finally {
    setLoginLoading(false);
  }
}

function logoutAdmin() {
  clearSession();
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-dashboard').style.display = 'none';
  stopOrdersPolling();
  const pw = document.getElementById('admin-password');
  if (pw) pw.value = '';
  hideLoginError();
}

function togglePasswordVisibility() {
  const input = document.getElementById('admin-password');
  const btn = document.getElementById('toggle-pw-btn');
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  if (btn) btn.textContent = show ? '🙈' : '👁';
}

async function handleChangePassword(e) {
  if (e) e.preventDefault();
  const msg = document.getElementById('change-pw-msg');
  const btn = document.getElementById('change-pw-btn');
  const showMsg = (text, ok) => {
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'form-msg ' + (ok ? 'is-ok' : 'is-err');
    msg.style.display = 'block';
  };

  const currentPw = document.getElementById('current-password')?.value || '';
  const newUser = (document.getElementById('new-username')?.value || '').trim();
  const newPw = document.getElementById('new-password')?.value || '';
  const confirmPw = document.getElementById('confirm-password')?.value || '';

  if (!currentPw || !newPw || !confirmPw) {
    showMsg('กรุณากรอกข้อมูลให้ครบ', false);
    return;
  }
  if (newPw.length < 6) {
    showMsg('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', false);
    return;
  }
  if (newPw !== confirmPw) {
    showMsg('รหัสผ่านใหม่กับยืนยันไม่ตรงกัน', false);
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }
  try {
    if (!firebaseReady) initFirebase();
    const creds = await loadAdminCreds();
    const currentHash = await hashPassword(currentPw);
    if (currentHash !== creds.passwordHash) {
      showMsg('รหัสผ่านปัจจุบันไม่ถูกต้อง', false);
      return;
    }
    const username = newUser || creds.username;
    if (!username) {
      showMsg('ชื่อผู้ใช้ว่างไม่ได้', false);
      return;
    }
    await saveAdminCreds(username, newPw);
    const session = readSession();
    writeSession(username, !!(session && session.store === localStorage));
    updateAdminWelcome();
    const hint = document.getElementById('login-hint');
    if (hint) hint.style.display = 'none';
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    showMsg('บันทึกบัญชีเรียบร้อยแล้ว', true);
  } catch (err) {
    console.error('handleChangePassword:', err);
    showMsg('บันทึกไม่สำเร็จ: ' + (err.message || err), false);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'บันทึกบัญชี'; }
  }
}

function updateAdminWelcome() {
  const el = document.getElementById('admin-welcome');
  if (!el) return;
  const name = getLoggedInUsername();
  el.textContent = name ? `ยินดีต้อนรับ, ${name}` : '';
}

function showAdminDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';
  updateAdminWelcome();

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
  loadShopStatusFromFirebase();
  subscribeShopStatus();
  loadRevenueClearedAt().then(() => renderRevenue());
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
        updateAdminShopToggleUI();
        fillShopBrandingForm();
      }
      if (btn.dataset.tab === 'revenue') {
        renderRevenue();
      }
    });
  });
}

// ===== Orders (Admin) =====
let currentOrderStatus = 'active';

// Track previous order IDs for new-order highlight
let previousOrderIds = new Set();

// จุดตัดรายได้หลังรีเซ็ต (ISO string) — ออเดอร์ completed หลังเวลานี้ถึงนับเป็นรายได้
let revenueClearedAt = null;

function getRevenueClearedAt() {
  return revenueClearedAt;
}

function setRevenueClearedAt(iso) {
  revenueClearedAt = iso || null;
  if (firebaseReady && db) {
    db.collection('settings').doc('revenue').set({
      clearedAt: iso || null,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(err => console.warn('save revenue clearedAt:', err));
  }
}

async function loadRevenueClearedAt() {
  if (firebaseReady && db) {
    try {
      const doc = await db.collection('settings').doc('revenue').get();
      if (doc.exists && doc.data().clearedAt) {
        revenueClearedAt = doc.data().clearedAt;
        return;
      }
    } catch (e) {
      console.warn('loadRevenueClearedAt:', e);
    }
  }
  getRevenueClearedAt();
}

function getRevenueOrders() {
  const cleared = getRevenueClearedAt();
  return getOrders()
    .filter(o => o.status === 'completed')
    .filter(o => {
      if (!cleared) return true;
      // นับเฉพาะที่เสร็จหลังรีเซ็ต — ใช้ completedAt ถ้ามี ไม่มีใช้ createdAt
      const t = o.completedAt || o.createdAt;
      return t && new Date(t) > new Date(cleared);
    })
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
}

function updateOrderStats(allOrders) {
  const pending = allOrders.filter(o => o.status === 'pending').length;
  const preparing = allOrders.filter(o => o.status === 'preparing').length;
  const shipping = allOrders.filter(o => o.status === 'shipping').length;
  const activeTotal = pending + preparing + shipping;

  const el = (id) => document.getElementById(id);
  if (el('stat-pending')) el('stat-pending').textContent = pending;
  if (el('stat-preparing')) el('stat-preparing').textContent = preparing;
  if (el('stat-shipping')) el('stat-shipping').textContent = shipping;
  if (el('stat-total')) el('stat-total').textContent = activeTotal;
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
  // อัปเดตรายได้คู่กัน (ถ้ามีแท็บ)
  if (document.getElementById('revenue-list')) {
    renderRevenue();
  }

  let orders = allOrders;
  if (currentOrderStatus === 'active') {
    // บอร์ดสด: ไม่โชว์ออเดอร์ที่เสร็จแล้ว (ไปอยู่เมนูรายได้)
    orders = orders.filter(o =>
      o.status === 'pending' || o.status === 'preparing' || o.status === 'shipping'
    );
  } else if (currentOrderStatus !== 'all') {
    orders = orders.filter(o => o.status === currentOrderStatus);
  } else {
    // กัน completed ออกจากบอร์ดสด
    orders = orders.filter(o => o.status !== 'completed');
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

    const hasGps = o.deliveryLat != null && o.deliveryLng != null && o.deliveryLat !== '' && o.deliveryLng !== '';
    const mapsUrl = hasGps
      ? `https://www.google.com/maps?q=${o.deliveryLat},${o.deliveryLng}`
      : '';
    const navUrl = hasGps
      ? `https://www.google.com/maps/dir/?api=1&destination=${o.deliveryLat},${o.deliveryLng}`
      : '';

    let gpsBlock = '';
    if (o.deliveryType === 'delivery') {
      if (hasGps) {
        gpsBlock = `
          <div class="order-gps-box">
            <div class="order-gps-title">📍 ที่อยู่จัดส่ง / พิกัด GPS</div>
            ${o.deliveryLocation ? `<div class="order-gps-addr">${o.deliveryLocation}</div>` : ''}
            <div class="order-gps-coords">${Number(o.deliveryLat).toFixed(6)}, ${Number(o.deliveryLng).toFixed(6)}</div>
            <div class="order-gps-actions">
              <a class="btn btn-primary btn-sm" href="${navUrl}" target="_blank" rel="noopener">🧭 นำทาง</a>
              <a class="btn btn-outline btn-sm" href="${mapsUrl}" target="_blank" rel="noopener">แผนที่</a>
              <a class="btn btn-outline btn-sm" href="tel:${o.customerPhone}">📞 โทร</a>
            </div>
          </div>`;
      } else if (o.deliveryLocation) {
        gpsBlock = `
          <div class="order-gps-box order-gps-no-pin">
            <div class="order-gps-title">📍 ที่อยู่จัดส่ง (ไม่มีพิกัด)</div>
            <div class="order-gps-addr">${o.deliveryLocation}</div>
            <div class="order-gps-actions">
              <a class="btn btn-outline btn-sm" href="tel:${o.customerPhone}">📞 โทร</a>
            </div>
          </div>`;
      }
    } else {
      // รับที่ร้าน
      gpsBlock = `
        <div class="order-gps-box order-gps-no-pin">
          <div class="order-gps-title">🏪 รับที่ร้าน</div>
          ${o.deliveryLocation ? `<div class="order-gps-addr">${o.deliveryLocation}</div>` : ''}
          ${o.pickupTime ? `<div class="order-pickup-time">⏰ เวลารับ: <strong>${formatPickupTime(o.pickupTime)}</strong></div>` : ''}
          <div class="order-gps-actions">
            <a class="btn btn-outline btn-sm" href="tel:${o.customerPhone}">📞 โทร</a>
          </div>
        </div>`;
    }

    return `
    <div class="order-card ${borderClass} ${newClass}" data-order-id="${o.id}">
      <div class="order-info">
        <h3>${o.id}${isNew ? ' <span style="color:var(--accent);font-size:0.8rem;">ใหม่!</span>' : ''}</h3>
        <div class="order-meta">
          <span>👤 ${o.customerName}</span>
          <a class="order-phone-link" href="tel:${o.customerPhone}">📞 ${o.customerPhone}</a>
          <span class="delivery-type-tag ${o.deliveryType === 'delivery' ? 'is-delivery' : 'is-pickup'}">${o.deliveryType === 'delivery' ? '🛵 จัดส่ง' : '🏪 รับที่ร้าน'}</span>
          <span>🕒 ${formatDate(o.createdAt)}</span>
          ${o.deliveryType === 'pickup' && o.pickupTime ? `<span class="pickup-time-tag">⏰ รับ ${formatPickupTime(o.pickupTime)}</span>` : ''}
        </div>
        ${gpsBlock}
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
        ${hasGps ? `<a class="btn btn-primary btn-sm" href="${navUrl}" target="_blank" rel="noopener">🧭 นำทาง</a>` : ''}
        <a class="btn btn-outline btn-sm" href="tel:${o.customerPhone}">📞 โทร</a>
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

  const hasGps = order.deliveryLat != null && order.deliveryLng != null && order.deliveryLat !== '' && order.deliveryLng !== '';
  const mapsUrl = hasGps ? `https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}` : '';
  const navUrl = hasGps ? `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLat},${order.deliveryLng}` : '';
  // แผนที่ฝัง (ไม่ต้องใช้ API key)
  const mapEmbed = hasGps
    ? `<div class="order-map-embed">
         <iframe
           title="แผนที่จัดส่ง"
           width="100%"
           height="200"
           style="border:0;border-radius:12px;"
           loading="lazy"
           referrerpolicy="no-referrer-when-downgrade"
           src="https://maps.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}&z=16&output=embed">
         </iframe>
       </div>`
    : '';

  let gpsDetailHtml = '';
  if (order.deliveryType === 'delivery') {
    gpsDetailHtml = `
      <div class="order-gps-box detail-gps-box">
        <div class="order-gps-title">📍 ที่อยู่จัดส่ง / พิกัด GPS</div>
        ${order.deliveryLocation ? `<div class="order-gps-addr">${order.deliveryLocation}</div>` : '<div class="order-gps-addr">ไม่ได้ระบุข้อความที่อยู่</div>'}
        ${hasGps ? `
          <div class="order-gps-coords">Lat: ${Number(order.deliveryLat).toFixed(6)} · Lng: ${Number(order.deliveryLng).toFixed(6)}</div>
          <div class="order-gps-actions">
            <a class="btn btn-primary btn-sm" href="${navUrl}" target="_blank" rel="noopener">🧭 นำทาง Google Maps</a>
            <a class="btn btn-outline btn-sm" href="${mapsUrl}" target="_blank" rel="noopener">เปิดแผนที่</a>
            <a class="btn btn-outline btn-sm" href="tel:${order.customerPhone}">📞 โทรลูกค้า</a>
          </div>
          ${mapEmbed}
        ` : `<div class="order-gps-coords" style="color:var(--warning);">ยังไม่มีพิกัด GPS จากลูกค้า</div>
          <div class="order-gps-actions">
            <a class="btn btn-outline btn-sm" href="tel:${order.customerPhone}">📞 โทรลูกค้า</a>
          </div>`}
      </div>`;
  } else {
    gpsDetailHtml = `
      <div class="order-gps-box order-gps-no-pin detail-gps-box">
        <div class="order-gps-title">🏪 รับที่ร้าน</div>
        ${order.deliveryLocation ? `<div class="order-gps-addr">${order.deliveryLocation}</div>` : ''}
        ${order.pickupTime ? `<div class="order-pickup-time">⏰ เวลารับที่ต้องการ: <strong>${formatPickupTime(order.pickupTime)}</strong></div>` : ''}
        <div class="order-gps-actions">
          <a class="btn btn-outline btn-sm" href="tel:${order.customerPhone}">📞 โทรลูกค้า</a>
        </div>
      </div>`;
  }

  const body = document.getElementById('order-detail-body');
  body.innerHTML = `
    <div class="detail-row"><span>หมายเลข</span><strong>${order.id}</strong></div>
    <div class="detail-row"><span>ลูกค้า</span><strong>${order.customerName}</strong></div>
    <div class="detail-row"><span>เบอร์โทร</span><strong><a href="tel:${order.customerPhone}">${order.customerPhone}</a> · <a class="btn btn-outline btn-sm" href="tel:${order.customerPhone}" style="margin-left:0.4rem;">📞 โทร</a></strong></div>
    <div class="detail-row"><span>วิธีรับ</span><strong>${order.deliveryType === 'delivery' ? '🛵 บริการจัดส่ง' : '🏪 รับที่ร้าน'}</strong></div>
    ${order.deliveryType === 'pickup' && order.pickupTime ? `<div class="detail-row"><span>เวลารับ</span><strong>⏰ ${formatPickupTime(order.pickupTime)}</strong></div>` : ''}
    <div class="detail-row"><span>เวลาสั่ง</span><strong>${formatDate(order.createdAt)}</strong></div>
    <div class="detail-row"><span>สถานะ</span>
      <span class="status-badge status-${order.status}">${STATUS_LABELS[order.status] || order.status}</span>
    </div>
    ${order.note ? `<div class="detail-row"><span>หมายเหตุ</span><strong>${order.note}</strong></div>` : ''}

    ${gpsDetailHtml}

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
      ${hasGps ? `<a class="btn btn-primary btn-sm" href="${navUrl}" target="_blank" rel="noopener">🧭 นำทาง</a>` : ''}
      <a class="btn btn-outline btn-sm" href="tel:${order.customerPhone}">📞 โทร</a>
    </div>
  `;

  document.getElementById('order-detail-modal')?.classList.add('show');
}

function closeOrderDetail() {
  document.getElementById('order-detail-modal')?.classList.remove('show');
}

function updateOrderStatus(orderId, newStatus) {
  const patch = { status: newStatus };
  if (newStatus === 'completed') {
    patch.completedAt = new Date().toISOString();
  }
  updateOrderInFirebase(orderId, patch).then(() => {
    // อัปเดต cache ทันที
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) Object.assign(order, patch);
    renderOrders();
    if (newStatus === 'completed') {
      goToRevenueTab();
    }
    // ถ้า modal รายละเอียดเปิดอยู่ ให้อัปเดต
    if (document.getElementById('order-detail-modal')?.classList.contains('show')) {
      if (newStatus === 'completed') closeOrderDetail();
      else viewOrderDetail(orderId);
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
  const completedAt = new Date().toISOString();
  updateOrderInFirebase(orderId, { status: 'completed', completedAt }).then(() => {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = 'completed';
      order.completedAt = completedAt;
    }
    renderOrders();
    closeOrderDetail();
    showReceipt(orderId);
    // เด้งไปเมนูรายได้
    goToRevenueTab();
  });
}

function goToRevenueTab() {
  const btn = document.querySelector('.tab-btn[data-tab="revenue"]');
  if (btn) btn.click();
  else renderRevenue();
}

function renderRevenue() {
  const list = document.getElementById('revenue-list');
  if (!list) return;

  const orders = getRevenueOrders();
  const total = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const count = orders.length;

  const totalEl = document.getElementById('revenue-total-amount');
  const countEl = document.getElementById('revenue-order-count');
  const noteEl = document.getElementById('revenue-note');

  if (totalEl) totalEl.textContent = formatPrice(total) + ' ฿';
  if (countEl) countEl.textContent = String(count);

  const cleared = getRevenueClearedAt();
  if (noteEl) {
    noteEl.textContent = cleared
      ? `นับจากหลังรีเซ็ตล่าสุด (${formatDate(cleared)}) · ออเดอร์ที่กดเสร็จแล้วจะมาอยู่ที่นี่`
      : 'ออเดอร์ที่กด «เสร็จแล้ว» จะถูกย้ายมาที่นี่';
  }

  if (orders.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">💰</div>
        <p>ยังไม่มีรายได้ในรอบนี้<br><small>เมื่อกดเสร็จออเดอร์ จะปรากฏที่นี่</small></p>
      </div>`;
    return;
  }

  list.innerHTML = orders.map(o => {
    const itemSummary = (o.items || []).map(i => `${i.name}×${i.qty}`).join(', ');
    const when = o.completedAt || o.createdAt;
    return `
      <div class="order-card revenue-order-card" data-order-id="${o.id}">
        <div class="order-info">
          <h3>#${o.id}</h3>
          <div class="order-meta">
            <span>👤 ${o.customerName || '-'}</span>
            <span>📞 ${o.customerPhone || '-'}</span>
            <span class="delivery-type-tag ${o.deliveryType === 'delivery' ? 'is-delivery' : 'is-pickup'}">${o.deliveryType === 'delivery' ? '🛵 จัดส่ง' : '🏪 รับที่ร้าน'}</span>
            <span>🕒 ${formatDate(when)}</span>
          </div>
          <div style="margin-top:0.35rem; font-size:0.88rem; color:var(--text-muted);">${itemSummary}</div>
          <div style="margin-top:0.45rem;">
            <span class="status-badge status-completed">สำเร็จ</span>
            <strong style="margin-left:0.8rem; color:var(--primary); font-size:1.1rem;">+${formatPrice(o.total)} ฿</strong>
          </div>
        </div>
        <div class="order-actions">
          <button class="btn btn-outline btn-sm" onclick="showReceipt('${o.id}')">🧾 ใบเสร็จ</button>
          <button class="btn btn-outline btn-sm" onclick="viewOrderDetail('${o.id}')">รายละเอียด</button>
        </div>
      </div>`;
  }).join('');
}

async function resetRevenue() {
  const pw = prompt('กรุณากรอกรหัสผ่านผู้ขายเพื่อรีเซ็ตรายได้:');
  if (pw === null) return;
  const creds = await loadAdminCreds();
  const hash = await hashPassword(pw);
  if (hash !== creds.passwordHash) {
    alert('รหัสผ่านไม่ถูกต้อง');
    return;
  }
  if (!confirm('รีเซ็ตรายได้ทั้งหมดในรอบนี้?\n\nยอดรวมจะเริ่มนับใหม่จาก 0\n(ออเดอร์เก่าจะไม่ถูกลบ แต่ไม่นับในรายได้อีก)')) {
    return;
  }
  const now = new Date().toISOString();
  setRevenueClearedAt(now);
  renderRevenue();
  alert('รีเซ็ตรายได้เรียบร้อยแล้ว\nยอดเริ่มนับใหม่จากออเดอร์ที่เสร็จหลังจากนี้');
}

let promptPayCache = '';

function getPromptPayImage() {
  return promptPayCache || '';
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
      promptPayCache = url;
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
  if (finalUrl && finalUrl.startsWith('data:') && finalUrl.length > 250000) {
    finalUrl = await compressImageIfNeeded(finalUrl, 360, 0.65);
  }
  promptPayCache = finalUrl;
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
      alert('บันทึกรูปพร้อมเพย์ไม่สำเร็จ');
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
        alert('บันทึกรูปพร้อมเพย์เรียบร้อย (เก็บ base64 ในฐานข้อมูล)');
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

  const branding = getShopBranding();
  const logoHtml = branding.logoType === 'image' && branding.logo
    ? `<img src="${branding.logo}" alt="logo" style="width:48px;height:48px;object-fit:contain;border-radius:8px;">`
    : `<div class="receipt-logo">${branding.logo || '☕'}</div>`;

  body.innerHTML = `
    <div class="receipt-paper" id="receipt-print-area">
      <div class="receipt-header">
        ${logoHtml}
        <h2>${branding.name || 'Coffee Shop'}</h2>
        <p>${branding.receiptSubtitle || 'ใบเสร็จรับเงิน'}</p>
      </div>
      <div class="receipt-meta">
        <div><span>เลขที่</span><strong>${order.id}</strong></div>
        <div><span>วันที่</span><strong>${formatDate(order.createdAt)}</strong></div>
        <div><span>ลูกค้า</span><strong>${order.customerName}</strong></div>
        <div><span>เบอร์โทร</span><strong>${order.customerPhone}</strong></div>
        <div><span>วิธีรับ</span><strong>${order.deliveryType === 'delivery' ? 'จัดส่ง' : 'รับที่ร้าน'}</strong></div>
        ${order.deliveryLocation ? `<div><span>ที่อยู่</span><strong>${order.deliveryLocation}</strong></div>` : ''}
        ${order.deliveryType === 'pickup' && order.pickupTime ? `<div><span>เวลารับ</span><strong>${formatPickupTime(order.pickupTime)}</strong></div>` : ''}
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

  list.innerHTML = products.map(p => {
    const soldOut = !!p.outOfStock;
    return `
    <div class="admin-product-item ${soldOut ? 'is-sold-out' : ''}">
      <div class="info">
        <div class="thumb">
          ${p.image
            ? `<img src="${p.image}" alt="" onerror="this.parentElement.innerHTML='${getIcon(p.category)}'">`
            : getIcon(p.category)}
          ${soldOut ? '<span class="admin-sold-out-mark">หมด</span>' : ''}
        </div>
        <div>
          <div class="name">${p.name}${soldOut ? ' <span class="sold-out-label">สินค้าหมด</span>' : ''}</div>
          <div class="meta">${p.category} · ${formatPrice(p.price)} ฿</div>
        </div>
      </div>
      <div class="admin-product-actions">
        <button type="button" class="btn btn-sm ${soldOut ? 'btn-success-soft' : 'btn-warning-soft'}"
          onclick="toggleOutOfStock('${p.id}')"
          title="${soldOut ? 'เปิดขายอีกครั้ง' : 'ตั้งเป็นสินค้าหมด'}">
          ${soldOut ? '✅ มีสินค้า' : '🚫 สินค้าหมด'}
        </button>
        <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')">แก้ไข</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">ลบ</button>
      </div>
    </div>`;
  }).join('');
}

/** สลับสถานะสินค้าหมด / มีสินค้า */
async function toggleOutOfStock(id) {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return;
  products[idx] = {
    ...products[idx],
    outOfStock: !products[idx].outOfStock
  };
  await saveProducts(products);
  renderAdminProducts();
  renderProducts();
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
  maxWidth = maxWidth || 480;
  quality = quality == null ? 0.7 : quality;
  return new Promise(resolve => {
    if (!dataUrl || !String(dataUrl).startsWith('data:')) {
      resolve(dataUrl || '');
      return;
    }
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * (maxWidth / w)); w = maxWidth; }
      const maxHeight = Math.round(maxWidth * 1.25);
      if (h > maxHeight) { w = Math.round(w * (maxHeight / h)); h = maxHeight; }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        let compressed = canvas.toDataURL('image/jpeg', quality);
        let q = quality;
        while (compressed.length > 180000 && q > 0.4) {
          q = Math.max(0.4, q - 0.1);
          compressed = canvas.toDataURL('image/jpeg', q);
        }
        if (compressed.length > 180000 && canvas.width > 240) {
          const c2 = document.createElement('canvas');
          const scale = 240 / canvas.width;
          c2.width = 240;
          c2.height = Math.max(1, Math.round(canvas.height * scale));
          const ctx2 = c2.getContext('2d');
          ctx2.fillStyle = '#FFFFFF';
          ctx2.fillRect(0, 0, c2.width, c2.height);
          ctx2.drawImage(canvas, 0, 0, c2.width, c2.height);
          compressed = c2.toDataURL('image/jpeg', 0.65);
        }
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
    // สร้าง id ก่อน ถ้าเป็นสินค้าใหม่
    const productId = id || generateId('p');

    // เก็บ base64 ในฐานข้อมูลเท่านั้น — ไม่ใช้ Firebase Storage
    if (image && image.startsWith('data:') && image.length > 250000) {
      image = await compressImageIfNeeded(image, 400, 0.65);
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
    alert(image && image.startsWith('data:')
      ? msg + ' (เก็บรูป base64 ในฐานข้อมูลแล้ว)'
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
  // สินค้า/ออเดอร์ ซิงค์ผ่าน Firebase onSnapshot แล้ว
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

let trackSearchBusy = false;
function startTrackPolling() {
  stopTrackPolling();
  // รีเฟรชจาก Firebase ทุก 50 วินาที ขณะเปิดหน้าติดตาม
  trackPollingTimer = setInterval(() => {
    const trackResult = document.getElementById('track-result');
    const trackPhone = document.getElementById('track-phone');
    if (trackResult && trackResult.style.display !== 'none' &&
        trackPhone?.value.trim() && !trackSearchBusy) {
      trackSearchBusy = true;
      Promise.resolve(searchOrder()).finally(() => { trackSearchBusy = false; });
    }
  }, 50000);
}

function stopTrackPolling() {
  if (trackPollingTimer) {
    clearInterval(trackPollingTimer);
    trackPollingTimer = null;
  }
}


// ===== Track Order (Buyer) — ค้นด้วยเบอร์โทร แสดงออเดอร์ทั้งหมด =====
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

const TRACK_STATUS_MAP = {
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

function openTrack(e) {
  if (e) {
    try { e.preventDefault(); } catch (_) {}
  }
  // ไม่ล้างเบอร์ถ้ามีค่าอยู่แล้ว (เช่น หลังสั่งซื้อ)
  const resultEl = document.getElementById('track-result');
  if (resultEl) resultEl.style.display = 'none';
  const modal = document.getElementById('track-modal');
  if (!modal) {
    alert('ไม่พบหน้าต่างติดตามออเดอร์\nกรุณารีเฟรชหน้าเว็บแล้วลองใหม่');
    return;
  }
  modal.classList.add('show');
  // โฟกัสช่องเบอร์โทร
  setTimeout(() => {
    const phoneEl = document.getElementById('track-phone');
    if (phoneEl) phoneEl.focus();
  }, 100);
  startTrackPolling();
}

function closeTrack() {
  document.getElementById('track-modal')?.classList.remove('show');
  stopTrackPolling();
}

/** สร้างการ์ดสถานะออเดอร์ 1 ใบ */
function renderTrackOrderCard(order) {
  const st = TRACK_STATUS_MAP[order.status] || TRACK_STATUS_MAP.pending;
  const isCancelled = order.status === 'cancelled';
  const isDone = order.status === 'completed' || isCancelled;

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

  const itemsHtml = (order.items || []).map(i =>
    `<div class="track-info-row"><span>${i.name} × ${i.qty}${i.note ? ' <small style="color:var(--primary-light);">(📝 '+i.note+')</small>' : ''}</span><span>${formatPrice(i.price * i.qty)} ฿</span></div>`
  ).join('');

  return `
    <div class="track-status-card" data-order-id="${order.id}">
      ${queueHtml}
      <div class="track-status-icon">${st.icon}</div>
      <div class="track-status-label" style="color: ${isCancelled ? 'var(--danger)' : 'var(--primary)'}">${st.label}</div>
      <div class="track-status-desc">${st.desc}</div>
      ${timelineHtml}
      <div class="track-info-list">
        <div class="track-info-row"><span>หมายเลข</span><strong>${order.id}</strong></div>
        <div class="track-info-row"><span>ลูกค้า</span><strong>${order.customerName}</strong></div>
        <div class="track-info-row"><span>วิธีรับ</span><strong>${order.deliveryType === 'delivery' ? '🛵 จัดส่ง' : '🏪 รับที่ร้าน'}</strong></div>
        ${order.deliveryLocation ? `<div class="track-info-row"><span>ที่อยู่</span><strong>📍 ${order.deliveryLocation}${order.deliveryLat && order.deliveryLng ? ` <a href="https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}" target="_blank" rel="noopener" class="maps-link">แผนที่↗</a>` : ''}</strong></div>` : ''}
        ${order.deliveryType === 'pickup' && order.pickupTime ? `<div class="track-info-row"><span>เวลารับ</span><strong>⏰ ${formatPickupTime(order.pickupTime)}</strong></div>` : ''}
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

async function searchOrder() {
  const phone = document.getElementById('track-phone')?.value.trim() || '';
  const resultEl = document.getElementById('track-result');
  if (!resultEl) return;

  if (!phone) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="track-not-found">
        <div class="icon">🔍</div>
        <p>กรุณากรอกเบอร์โทรที่ใช้สั่งซื้อ</p>
      </div>`;
    return;
  }

  const norm = normalizePhone(phone);
  if (norm.length < 9) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="track-not-found">
        <div class="icon">📱</div>
        <p>กรุณากรอกเบอร์โทรให้ครบ</p>
      </div>`;
    return;
  }

  // แสดงสถานะกำลังค้นหา
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div class="track-not-found">
      <div class="icon">⏳</div>
      <p>กำลังค้นหาจาก Firebase...</p>
    </div>`;

  let orders = [];
  try {
    if (!firebaseReady) initFirebase();
    if (!firebaseReady || !db) {
      resultEl.innerHTML = `
        <div class="track-not-found">
          <div class="icon">☁️</div>
          <p>ยังเชื่อม Firebase ไม่ได้<br><small>ตรวจสอบการเชื่อมต่อแล้วลองใหม่</small></p>
        </div>`;
      return;
    }

    // 1) ค้นด้วย customerPhoneNorm (ออเดอร์ใหม่)
    let snap = await db.collection('orders')
      .where('customerPhoneNorm', '==', norm)
      .get();

    if (snap.empty) {
      // 2) fallback: ดึงออเดอร์ล่าสุดแล้วกรองเบอร์ (รองรับออเดอร์เก่าที่ยังไม่มี phoneNorm)
      snap = await db.collection('orders')
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();
      orders = snap.docs
        .map(d => d.data())
        .filter(o => {
          const n = o.customerPhoneNorm || normalizePhone(o.customerPhone);
          return n === norm;
        });
    } else {
      orders = snap.docs.map(d => d.data());
    }

    // อัปเดต cache ด้วยผลลัพธ์ (ไม่ทับทั้งก้อน ถ้ามี subscribe อยู่)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // รวมเข้า ordersCache เพื่อให้ queue position คำนวณได้
    // โหลดออเดอร์ที่กำลังทำทั้งหมดสำหรับคิว
    try {
      const activeSnap = await db.collection('orders')
        .where('status', 'in', ['pending', 'preparing', 'shipping'])
        .get();
      const activeOrders = activeSnap.docs.map(d => d.data());
      // merge เข้า cache
      const byId = {};
      (ordersCache || []).forEach(o => { if (o && o.id) byId[o.id] = o; });
      activeOrders.forEach(o => { if (o && o.id) byId[o.id] = o; });
      orders.forEach(o => { if (o && o.id) byId[o.id] = o; });
      ordersCache = Object.values(byId);
    } catch (e) {
      // ถ้า query 'in' ไม่ได้ (rules/index) ใช้ orders ที่ค้นเจออย่างเดียว
      console.warn('load active orders for queue:', e);
      const byId = {};
      (ordersCache || []).forEach(o => { if (o && o.id) byId[o.id] = o; });
      orders.forEach(o => { if (o && o.id) byId[o.id] = o; });
      ordersCache = Object.values(byId);
    }
  } catch (err) {
    console.error('searchOrder Firebase:', err);
    resultEl.innerHTML = `
      <div class="track-not-found">
        <div class="icon">⚠️</div>
        <p>ค้นหาไม่สำเร็จ<br><small>${(err && err.message) ? err.message : 'ลองใหม่อีกครั้ง'}</small></p>
      </div>`;
    return;
  }

  if (orders.length === 0) {
    resultEl.innerHTML = `
      <div class="track-not-found">
        <div class="icon">😕</div>
        <p>ไม่พบออเดอร์ของเบอร์นี้<br><small>ตรวจสอบเบอร์โทรอีกครั้ง หรือยังไม่ได้สั่งซื้อ</small></p>
      </div>`;
    return;
  }

  const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const activeCount = orders.filter(o =>
    o.status === 'pending' || o.status === 'preparing' || o.status === 'shipping'
  ).length;

  const cardsHtml = orders.map(o => renderTrackOrderCard(o)).join('');

  resultEl.innerHTML = `
    <div class="track-list-header">
      <div class="track-live-badge">🔴 สด · Firebase · อัปเดต ${now}</div>
      <div class="track-list-summary">
        พบ <strong>${orders.length}</strong> ออเดอร์
        ${activeCount > 0 ? `· กำลังดำเนินการ <strong>${activeCount}</strong>` : ''}
      </div>
    </div>
    <div class="track-orders-list">
      ${cardsHtml}
    </div>`;
}

// ให้เรียกจากปุ่ม HTML (onclick) ได้แน่นอน
window.openTrack = openTrack;
window.closeTrack = closeTrack;
window.searchOrder = searchOrder;


// ===== Reset ทั้งหมด (ต้องใส่รหัสผ่าน) =====
async function resetAllData() {
  const pw = prompt('กรุณากรอกรหัสผ่านเพื่อรีเซ็ตออเดอร์:\n(รหัสเดียวกับหน้าผู้ขาย)');
  if (pw === null) return;
  const creds = await loadAdminCreds();
  const hash = await hashPassword(pw);
  if (hash !== creds.passwordHash) {
    alert('รหัสผ่านไม่ถูกต้อง');
    return;
  }
  if (!confirm('ยืนยันรีเซ็ตออเดอร์ทั้งหมด?\n\n- ออเดอร์ทั้งหมดจะถูกลบ\n- หมายเลขออเดอร์เริ่มที่ 000 ใหม่\n\n(สินค้าและหมวดหมู่จะไม่ถูกลบ)')) {
    return;
  }

  ordersCache = [];

  if (!firebaseReady || !db) {
    alert('ต้องเชื่อม Firebase ก่อน');
    return;
  }
  try {
    const batch = db.batch();
    const orderSnap = await db.collection('orders').get();
    orderSnap.docs.forEach(d => batch.delete(d.ref));
    batch.set(db.collection('settings').doc('orderCounter'), {
      value: 0,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    await batch.commit();
  } catch (e) {
    console.error('Firebase reset orders error:', e);
    alert('รีเซ็ตไม่สำเร็จ: ' + (e.message || e));
    return;
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
      const trackPhone = document.getElementById('track-phone');
      if (trackResult && trackResult.style.display !== 'none' &&
          trackPhone?.value.trim()) {
        searchOrder();
      }
    });
    loadShopStatusFromFirebase();
    subscribeShopStatus();
  } else {
    renderProducts();
    applyShopBrandingToUI();
    updateShopClosedUI();
  }

  setupFilters();
  updateCartUI();
  applyShopBrandingToUI();
  updateShopClosedUI();

  document.getElementById('cart-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    openCart();
  });
  document.getElementById('close-cart')?.addEventListener('click', closeCart);
  document.getElementById('checkout-btn')?.addEventListener('click', openCheckout);
  document.getElementById('close-checkout')?.addEventListener('click', closeCheckout);
  document.getElementById('checkout-form')?.addEventListener('submit', placeOrder);
  document.getElementById('close-success')?.addEventListener('click', closeSuccess);

  // วิธีรับสินค้า + ปักหมุดแผนที่
  document.querySelectorAll('.delivery-type-btn').forEach(btn => {
    btn.addEventListener('click', () => setDeliveryType(btn.dataset.type));
  });
  document.getElementById('pin-location-btn')?.addEventListener('click', pinLocationOnMaps);
  document.getElementById('clear-pin-btn')?.addEventListener('click', clearPinnedLocation);
  document.querySelectorAll('.pickup-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = Number(btn.dataset.mins || 0);
      setPickupTimeFromNow(mins);
    });
  });
  document.getElementById('track-from-success')?.addEventListener('click', () => {
    closeSuccess();
    openTrack();
    // ถ้ามีเบอร์ในช่องแล้ว ให้ค้นทันที
    const phoneInput = document.getElementById('track-phone');
    if (phoneInput?.value.trim()) searchOrder();
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

  // Track order (ค้นด้วยเบอร์โทร)
  document.getElementById('track-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    openTrack();
  });
  document.getElementById('close-track')?.addEventListener('click', closeTrack);
  document.getElementById('track-search-btn')?.addEventListener('click', searchOrder);
  document.getElementById('track-phone')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchOrder();
    }
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
  } else {
    initFirebase();
    if (firebaseReady && db) {
      db.collection('settings').doc('admin').get().then(doc => {
        const hint = document.getElementById('login-hint');
        if (doc.exists && hint) hint.style.display = 'none';
      }).catch(() => {});
    }
  }

  document.getElementById('login-form')?.addEventListener('submit', loginAdmin);
  document.getElementById('toggle-pw-btn')?.addEventListener('click', togglePasswordVisibility);
  document.getElementById('logout-btn')?.addEventListener('click', logoutAdmin);
  document.getElementById('reset-all-btn')?.addEventListener('click', resetAllData);
  document.getElementById('reset-revenue-btn')?.addEventListener('click', resetRevenue);
  document.getElementById('change-password-form')?.addEventListener('submit', handleChangePassword);

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
  document.getElementById('toggle-shop-btn')?.addEventListener('click', toggleShopClosed);
  document.getElementById('shop-branding-form')?.addEventListener('submit', handleSaveShopBranding);
  document.getElementById('shop-logo-file')?.addEventListener('change', handleShopLogoFile);
  document.getElementById('clear-shop-logo-btn')?.addEventListener('click', clearShopLogoImage);
  document.querySelectorAll('.logo-emoji-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji || '☕';
      const input = document.getElementById('shop-logo-emoji');
      if (input) input.value = emoji;
      saveShopBranding({ logo: emoji, logoType: 'emoji' }).catch(() => {});
    });
  });
  updatePromptPayPreview();
  updateAdminShopToggleUI();
  if (!isAdminLoggedIn()) {
    initFirebase();
    if (firebaseReady) {
      loadShopStatusFromFirebase();
      subscribeShopStatus();
    } else {
      applyShopBrandingToUI();
    }
  }

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
