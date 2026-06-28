# 🕌 নামাজের সময় — Prayer Times & Qibla App

একটি সুন্দর বাংলা নামাজের সময়সূচী ও কিবলা নির্দেশক ওয়েব অ্যাপ।

## ✨ ফিচার

- 📍 **GPS ভিত্তিক সঠিক সময়** — আপনার অবস্থান অনুযায়ী
- 🕌 **৬ ওয়াক্ত নামাজের সময়** — ফজর, যোহর, আসর, মাগরিব, এশা
- ⏰ **পরবর্তী নামাজের কাউন্টডাউন**
- 🧭 **কিবলা কম্পাস** — ডিভাইস সেন্সর ব্যবহার করে
- 📱 **PWA সাপোর্ট** — ফোনে ইনস্টল করা যাবে
- 🌙 **ইসলামিক ডার্ক থিম**

## 📁 ফাইল স্ট্রাকচার

```
prayer-app/
├── index.html          # মেইন HTML
├── manifest.json       # PWA manifest
├── css/
│   └── style.css       # সব স্টাইল
├── js/
│   ├── prayer.js       # নামাজের সময় গণনা
│   ├── qibla.js        # কিবলা ও কম্পাস
│   └── app.js          # UI কন্ট্রোলার
└── assets/
    ├── icon-192.png    # অ্যাপ আইকন
    └── icon-512.png    # অ্যাপ আইকন
```

## 🚀 ব্যবহার

১. রিপো ক্লোন করুন:
```bash
git clone https://github.com/YOUR_USERNAME/prayer-app.git
```

২. `index.html` ব্রাউজারে খুলুন — ব্যস!

## 🌐 Deploy (Vercel / Netlify)

**Vercel:**
```bash
npm i -g vercel
vercel
```

**Netlify:** GitHub রিপো কানেক্ট করুন → Auto deploy হবে

## 📱 ফোনে ইনস্টল (PWA)

১. Chrome-এ সাইট খুলুন
২. মেনু → **"Add to Home Screen"**
৩. হুবহু অ্যাপের মতো ইনস্টল হবে

## 🧮 গণনা পদ্ধতি

- **Fajr / Isha:** Muslim World League (18° / 17°)
- **Asr:** Shafi method
- **কিবলা:** Spherical trigonometry (Great Circle)

## 📜 License

MIT License — বাণিজ্যিক ব্যবহারে স্বাগতম
