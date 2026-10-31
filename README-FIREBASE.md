# วิธีเชื่อม Firebase สำหรับระบบร้านกาแฟ

## 1. สร้างโปรเจกต์ Firebase

1. ไปที่ https://console.firebase.google.com
2. กด **Add project** ตั้งชื่อ เช่น `coffee-shop`
3. สร้างเสร็จแล้วกดไอคอน **Web** (`</>`)
4. ตั้งชื่อแอป แล้วคัดลอกค่า `firebaseConfig`

## 2. สร้าง Firestore Database

1. เมนูซ้าย → **Build → Firestore Database**
2. กด **Create database**
3. เลือก **Start in test mode** (สำหรับทดสอบ)
4. เลือก region เช่น `asia-southeast1` (สิงคโปร์)

### กฎความปลอดภัย (ทดสอบ)
ในแท็บ Rules ใช้แบบนี้ชั่วคราว:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ โหมดทดสอบเปิดให้ทุกคนอ่าน/เขียนได้ ใช้ได้แค่ช่วงพัฒนา  
> ก่อนขึ้น production ควรจำกัดสิทธิ์


## 2.1 สร้าง Firebase Storage (สำหรับรูปสินค้า + QR พร้อมเพย์)

1. เมนูซ้าย → **Build → Storage**
2. กด **Get started**
3. เลือก **Start in test mode** (ช่วงพัฒนา)
4. เลือก region เดียวกับ Firestore ถ้าได้

### กฎ Storage (ทดสอบ)
ในแท็บ Rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

> รูปสินค้าจะถูกเก็บที่ `products/...`  
> รูป PromptPay เก็บที่ `settings/promptpay_...`  
> URL รูปพร้อมเพย์เก็บใน Firestore `settings/promptpay`

## 3. ใส่ Config ในโปรเจกต์

เปิดไฟล์ `firebase-config.js` แล้วแก้เป็นค่าของคุณ:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "coffee-shop-xxxxx.firebaseapp.com",
  projectId: "coffee-shop-xxxxx",
  storageBucket: "coffee-shop-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};

// สำคัญ: เปลี่ยนเป็น true
const USE_FIREBASE = true;
```

## 4. อัปโหลดขึ้นโฮสต์

อัปโหลดไฟล์ทั้งหมด:

```
index.html
admin.html
style.css
app.js
firebase-config.js
```

## 5. ทดสอบ

1. เปิดหน้าเว็บบนมือถือ
2. เปิดหน้าผู้ขายบนคอมพิวเตอร์ (admin.html รหัส `admin123`)
3. สั่งซื้อจากมือถือ → ออเดอร์ขึ้นที่หน้าผู้ขายทันที
4. เปลี่ยนสถานะที่ผู้ขาย → หน้าติดตามออเดอร์บนมือถืออัปเดตเอง

## โครงสร้างข้อมูลใน Firestore

### Collection: `products`
```
{
  id: "p1",
  name: "ลาเต้",
  price: 65,
  category: "กาแฟ",
  description: "...",
  image: ""
}
```

### Collection: `orders`
```
{
  id: "001",
  customerName: "สมชาย",
  customerPhone: "0812345678",
  deliveryType: "pickup",       // pickup | delivery
  deliveryLocation: "รับที่ร้าน",
  deliveryLat: null,
  deliveryLng: null,
  pickupTime: "14:30",          // เฉพาะรับที่ร้าน
  note: "",
  items: [{ id, name, price, qty, note }],
  total: 130,
  status: "pending",  // pending | preparing | shipping | completed | cancelled
  createdAt: "2026-..."
}
```

### Document: `settings/orderCounter`
```
{ value: 5, updatedAt: "..." }  // ตัวนับหมายเลขออเดอร์ข้ามเครื่อง
```

### Document: `settings/shop`
```
{ closed: false }
```

## สลับกลับไปใช้ localStorage

ใน `firebase-config.js` ตั้ง:

```js
const USE_FIREBASE = false;
```

ระบบจะกลับไปเก็บข้อมูลในเบราว์เซอร์เหมือนเดิม
