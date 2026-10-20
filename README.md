# Günlük

React + Tailwind CSS ile yapılmış sade günlük defteri. Flow (Akış) uygulamasının tasarım dili, renk jetonları, Drive yedekleme mantığı ve PWA ayarları birebir alındı. Veriler tarayıcıda saklanır, istersen Google Drive ile cihazlar arasında eşitlenir. Telefona uygulama gibi kurulur.

## Özellikler

- **Yaz ve kaydet.** Başlık (isteğe bağlı), serbest metin, ruh hali (5 seviye) ve en fazla 5 etiket. `Ctrl/Cmd + Enter` ile kaydedilir.
- **Taslak kaybolmaz.** Yarım kalan yazı sayfa yenilense ya da uygulama kapansa da yerinde durur.
- **Odak modu.** Tam ekran, dikkat dağıtmayan yazı alanı. `Esc` ile çıkılır.
- **Günlere göre liste.** Bugün her zaman açık, geçmiş günler kapalı başlar. Yazıya dokununca tamamı açılır; düzenle ve sil (onaylı) orada.
- **Ara ve süz.** Başlık, metin ve etiketlerde arama; sık kullanılan etiketlerle tek dokunuşla süzme.
- **Seri ve seri koruması.** Üst üste yazdığın gün sayısı. Her hafta (pazartesi-pazar) 2 koruma hakkın var: yazmadığın bir günde otomatik kullanılır ve seri bozulmaz, her pazartesi yenilenir, biriktirilmez. Hakkın bittiyse yazılmayan gün seriyi sıfırlar. Korunan gün sayıya eklenmez. Hesap yazılarından çıkarıldığı için cihazlar arasında hep aynıdır.
- **Yedekleme.** Üstteki kalkan simgesi: `.json` yedek indir, yedekten geri yükle (mevcut yazıların üzerine yazmaz, birleştirir), okunur `.txt` olarak indir. 14 günden uzun süredir yedek alınmadıysa nazik bir hatırlatma çıkar.
- **Drive eşitleme.** Flow ile aynı yöntem: yazılar Drive'daki gizli uygulama klasörüne `daily.json` olarak yazılır. Aynı yazı iki yerde değişirse son değişiklik kazanır; silmeler diğer cihaza da ulaşır (30 gün silme izi).
- **Çevrimdışı çalışır.** Service worker ile; ana ekrana ekleyince uygulama gibi açılır. Simgeye uzun basınca "Yeni yazı" kısayolu çıkar.
- Açık ve koyu tema otomatik, yazı tipi Geist uygulamayla birlikte gelir.

## Yerelde çalıştırma

```bash
npm install
cp .env.example .env.local   # Drive eşitlemesi için istemci kimliğini yaz (Flow'dakiyle aynı olabilir)
npm run dev                  # http://localhost:5173
npm test                     # mantık testleri
```

İstemci kimliği olmadan da çalışır; Drive eşitleme kapalı kalır, JSON yedek yine kullanılabilir.

## Yayınlama (GitHub Pages)

1. Yeni bir depo aç (ör. `daily`) ve bu klasörün içeriğini `main` dalına yükle.
2. **Settings → Pages → Source** kısmını **GitHub Actions** yap.
3. **Settings → Secrets and variables → Actions → Variables** bölümüne `VITE_GOOGLE_CLIENT_ID` ekle.
4. Site `https://<kullanıcı>.github.io/daily/` adresinde yayınlanır. Telefonda Chrome'da "Ana ekrana ekle", iPhone'da Safari'de Paylaş → "Ana Ekrana Ekle".

## Simgeler

`python3 scripts/make-icons.py` (Pillow gerekir) `public/` içindeki simgeleri yeniden üretir.
