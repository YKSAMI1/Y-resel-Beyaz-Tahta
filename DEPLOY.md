# 🚀 Yöresel Beyaz Tahta — Vercel'e Deploy Rehberi

## Adım 1: GitHub'a Yükle

```bash
# Proje klasöründe:
git init
git add .
git commit -m "Yöresel Beyaz Tahta - ilk versiyon"
git branch -M main
```

GitHub'da yeni bir **public** repo oluştur, sonra:

```bash
git remote add origin https://github.com/KULLANICI_ADIN/yoresel-beyaz-tahta.git
git push -u origin main
```

## Adım 2: Vercel Hesabı Oluştur

1. https://vercel.com adresine git
2. **"Sign Up"** → GitHub ile giriş yap
3. Ücretsiz plan yeterli (hobby)

## Adım 3: Projeyi Deploy Et

1. Vercel dashboard'da **"Add New..." → "Project"**
2. GitHub repo'nu bul ve **"Import"** tıkla
3. **"Deploy"** butonuna bas
4. 2-3 dakika içinde biter

## Adım 4: Veritabanı Ekle (Veri Kalıcılığı İçin)

1. Vercel dashboard → Projen → **"Storage"** sekmesi
2. **"Create Database" → "Postgres"** seç
3. **"Continue"** → isim ver (ör: "beyaz-tahta-db")
4. **"Create"** tıkla
5. Otomatik olarak `.env.local`'e eklenir
6. **"Redeploy"** tıkla (veritabanı bağlansın)

## Adım 5: Özel Domain (İsteğe Bağlı)

1. Vercel dashboard → Projen → **"Settings" → "Domains"**
2. Domain adını yaz (ör: `yoreselbeyaztahta.com`)
3. DNS ayarlarını yap (Vercel sana gösterir)

## ✅ Bitti!

Herkes artık şu linkten kullanabilir:
`https://proje-adin.vercel.app`

---

## Notlar

- **Ücretsiz plan** aylık 100GB bant genişliği veriyor
- **Soğuk start**: İlk açılışta 1-2 saniye gecikme olabilir (normal)
- **Veriler**: Vercel Postgres sayesinde kalıcı olarak saklanıyor
- **Güncelleme**: `git push` yapınca otomatik deploy olur

## Yerel Geliştirme

```bash
# .env.local olmadan çalışır (bellek içi depo kullanır)
npm run dev
```
