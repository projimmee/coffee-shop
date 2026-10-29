# ☕ Coffee Shop — ระบบจัดการร้านกาแฟ

ระบบสั่งซื้อและจัดการออเดอร์ร้านกาแฟ แบบ Pure HTML / CSS / JavaScript  
รองรับทั้ง **localStorage** (ใช้งานทันที) และ **Firebase** (ซิงค์ข้ามเครื่องแบบ real-time)

## ✨ คุณสมบัติ

### หน้าผู้ซื้อ (index.html)
- ดูเมนูสินค้า + กรองตามหมวดหมู่
- ใส่ตะกร้าพร้อมหมายเหตุ (ไม่ใส่น้ำตาล, เพิ่มนม ฯลฯ)
- สั่งซื้อ + ได้หมายเลขออเดอร์
- ติดตามสถานะออเดอร์แบบสด

### หน้าผู้ขาย (admin.html)
- เข้าสู่ระบบด้วยรหัส `admin123`
- แดชบอร์ดออเดอร์สด (รอทำ / กำลังทำ / สำเร็จ)
- เปลี่ยนสถานะออเดอร์ได้ทันที
- เพิ่ม / แก้ไข / ลบสินค้า
- รีเซ็ตข้อมูลทั้งหมด

## 🚀 วิธีใช้งานแบบเร็ว (ไม่ต้องติดตั้งอะไร)

1. ดาวน์โหลดหรือ clone โปรเจกต์นี้
2. เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์
3. เปิด `admin.html` ในแท็บอื่น → ใส่รหัส `admin123`
4. เริ่มสั่งซื้อและจัดการออเดอร์ได้เลย (ข้อมูลเก็บใน localStorage)

> หมายเหตุ: โหมด localStorage ใช้ได้เฉพาะเครื่อง/เบราว์เซอร์เดียวกัน

## 🔥 เชื่อม Firebase (ให้หลายเครื่องซิงค์กัน)

ดูรายละเอียดใน [README-FIREBASE.md](./README-FIREBASE.md)

สรุปสั้น ๆ:
1. สร้างโปรเจกต์ Firebase + Firestore
2. ใส่ค่า config ใน `firebase-config.js`
3. เปลี่ยน `USE_FIREBASE = true`
4. อัปโหลดไฟล์ขึ้น GitHub Pages / Netlify / Vercel ฯลฯ

## 📁 โครงสร้างไฟล์

```
coffee-shop/
├── index.html          # หน้าผู้ซื้อ
├── admin.html          # หน้าผู้ขาย
├── style.css           # สไตล์ทั้งหมด
├── app.js              # Logic หลัก
├── firebase-config.js  # Config Firebase
├── README.md
└── README-FIREBASE.md
```

## 🌐 วิธี Deploy ขึ้น GitHub Pages

### วิธีที่ 1: อัปโหลดผ่านเว็บ (ง่ายที่สุด)

1. ไปที่ [github.com/new](https://github.com/new)
2. ตั้งชื่อ repo เช่น `coffee-shop`
3. กด **Create repository**
4. กด **uploading an existing file**
5. ลากไฟล์ทั้งหมดในโฟลเดอร์นี้เข้าไป แล้วกด **Commit changes**
6. ไปที่ **Settings → Pages**
7. Source เลือก **Deploy from a branch**
8. Branch เลือก `main` / folder `/ (root)` แล้ว Save
9. รอสักครู่ จะได้ลิงก์ประมาณ  
   `https://<username>.github.io/coffee-shop/`

### วิธีที่ 2: ใช้ Git (แนะนำ)

```bash
# สร้าง repo บน GitHub ก่อน แล้วคัดลอก URL
git init
git add .
git commit -m "Initial commit: Coffee Shop system"
git branch -M main
git remote add origin https://github.com/<username>/coffee-shop.git
git push -u origin main
```

จากนั้นไปตั้งค่า GitHub Pages ตามข้อ 6–9 ด้านบน

## 🔐 รหัสผ่านผู้ขาย

- ค่าเริ่มต้น: `admin123`
- แก้ไขได้ใน `app.js` ตรงฟังก์ชัน `loginAdmin()`

## 📌 หมายเหตุ

- ข้อมูลสินค้าเริ่มต้นมี 10 รายการ (กาแฟ, ชา, ของหวาน, เครื่องดื่ม)
- หมายเลขออเดอร์วิ่ง 000–999 แล้ววนกลับ
- ถ้าใช้ Firebase แนะนำตั้ง Security Rules ให้เหมาะสมก่อนขึ้น production

---

Made with ☕ for small coffee shops
