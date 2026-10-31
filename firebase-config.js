// ============================================
// Firebase Config - Coffee Shop
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyB60FNnlKO1nVvlSbweOoRqG3rsEAzBcCQ",
  authDomain: "coffee-shop-900ba.firebaseapp.com",
  projectId: "coffee-shop-900ba",
  // ใช้ .appspot.com ให้เข้ากับ Storage SDK ได้เสถียร
  // (ใน Console อาจเห็นเป็น .firebasestorage.app ก็ใช้ร่วมกันได้)
  storageBucket: "coffee-shop-900ba.appspot.com",
  messagingSenderId: "260514385119",
  appId: "1:260514385119:web:0eb06f03a88a25ee182d6a",
  measurementId: "G-ZR1TNSEE2Z"
};

// เปิดใช้ Firebase (Firestore + Storage)
// true  = ซิงค์ข้ามเครื่องแบบ real-time (ต้องสร้าง Firestore + Rules ใน Console)
// false = เก็บเฉพาะในเบราว์เซอร์ (localStorage)
const USE_FIREBASE = true;
