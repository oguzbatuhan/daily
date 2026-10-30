# Günlük

React + Tailwind CSS ile yapılmış sade günlük defteri. Flow (Akış) uygulamasının tasarım dili, renk jetonları, bulut yedekleme mantığı ve PWA ayarları birebir alındı. Veriler tarayıcıda saklanır, istersen Google ile giriş yapıp Supabase'e yedeklenir ve cihazlar arasında eşitlenir. Telefona uygulama gibi kurulur.

## Özellikler

- **Yaz ve kaydet.** Başlık (isteğe bağlı), serbest metin, ruh hali (5 seviye) ve en fazla 5 etiket. `Ctrl/Cmd + Enter` ile kaydedilir.
- **Taslak kaybolmaz.** Yarım kalan yazı sayfa yenilense ya da uygulama kapansa da yerinde durur.
- **Odak modu.** Tam ekran, dikkat dağıtmayan yazı alanı. `Esc` ile çıkılır.
- **Günlere göre liste.** Ana ekranda yalnızca bugünün yazıları görünür. Yazıya dokununca tamamı açılır; düzenle ve sil (onaylı) orada.
- **Geçmiş çekmecesi.** Geçmiş günler küçük **Geçmiş** düğmesinin arkasında gizlidir (telefonda alttan açılan sayfa, geniş ekranda sağ panel). Günler en yeniden en eskiye, aylara ayrılmış sıralanır; yalnızca en yeni gün açık başlar. 30 günden eskisi için "Daha eski günler" düğmesi vardır. `Esc`, ✕ ya da dışına dokunmak kapatır.
- **Ara ve süz.** Geçmiş çekmecesinin içinde: başlık, metin ve etiketlerde arama (bugün dahil tüm günlerde); sık kullanılan etiketlerle tek dokunuşla süzme. Bugünkü bir yazının etiketine dokunmak çekmeceyi o etiketle süzülmüş açar.
- **Seri ve seri koruması.** Üst üste yazdığın gün sayısı. Her hafta (pazartesi-pazar) 2 koruma hakkın var: yazmadığın bir günde otomatik kullanılır ve seri bozulmaz, her pazartesi yenilenir, biriktirilmez. Hakkın bittiyse yazılmayan gün seriyi sıfırlar. Korunan gün sayıya eklenmez. Hesap yazılarından çıkarıldığı için cihazlar arasında hep aynıdır.
- **Yedekleme.** Üstteki kalkan simgesi: `.json` yedek indir, yedekten geri yükle (mevcut yazıların üzerine yazmaz, birleştirir), okunur `.txt` olarak indir. 14 günden uzun süredir yedek alınmadıysa nazik bir hatırlatma çıkar.
- **Bulut eşitleme.** Google ile giriş yap; yazılar Supabase'deki ortak `app_backups` tablosuna `app = daily` satırı olarak yazılır. Aynı yazı iki yerde değişirse son değişiklik kazanır; silmeler diğer cihaza da ulaşır (30 gün silme izi).
- **Çevrimdışı çalışır.** Service worker ile; ana ekrana ekleyince uygulama gibi açılır. Simgeye uzun basınca "Yeni yazı" kısayolu çıkar.
- Açık ve koyu tema otomatik, yazı tipi Geist uygulamayla birlikte gelir.

## Yerelde çalıştırma

```bash
npm install
cp .env.example .env.local   # Supabase URL ve anon anahtarını yaz (üç uygulamada aynı)
npm run dev                  # http://localhost:5173
npm test                     # mantık testleri
```

Supabase anahtarları olmadan da çalışır; bulut yedekleme kapalı kalır, JSON yedek yine kullanılabilir.

## Supabase yedekleme kurulumu (bir kez, üç uygulama için ortak)

Günlük, Akış ve Görevler **aynı Supabase projesini ve aynı tek tabloyu** (`app_backups`) kullanır. Her uygulama tabloda kendi satırına yazar (`app` sütunu: `daily`, `flow`, `task`), bu yüzden veriler karışmaz. Her kullanıcı yalnızca kendi satırlarını görür (RLS).

1. **Tablo:** Supabase → SQL Editor'a `supabase/setup.sql` dosyasının içeriğini yapıştırıp çalıştır (tekrar çalıştırmak güvenli).
2. **Google girişi:** Supabase → Authentication → Providers → **Google**'ı aç, Google Cloud'daki OAuth istemcisinin Client ID ve Client Secret değerlerini yaz. Google Cloud'da bu istemcinin **Authorized redirect URIs** listesine Supabase'in gösterdiği `https://<proje>.supabase.co/auth/v1/callback` adresini ekle.
3. **Yönlendirme adresleri:** Supabase → Authentication → URL Configuration → **Redirect URLs** listesine üç uygulamanın adreslerini ekle (sonda `/` olacak), yerel geliştirme için de `http://localhost:5173/`. Örnek: `https://oguzbatuhan.github.io/daily/`, `https://oguzbatuhan.github.io/flow/`, `https://oguzbatuhan.github.io/task/`.
4. **Anahtarlar:** Supabase → Project Settings → API'den `Project URL` ve `anon public` anahtarını al. Yerelde `.env.local` içine, yayında deponun **Settings → Secrets and variables → Actions → Variables** bölümüne `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` olarak ekle. Anahtar herkese açık olacak şekilde tasarlanmıştır; veriyi RLS korur. `service_role` anahtarını **asla** kullanma.

Tabloyu başka bir adla açtıysan `VITE_SUPABASE_TABLE` ile adını ver.

## Yayınlama (GitHub Pages)

1. Yeni bir depo aç (ör. `daily`) ve bu klasörün içeriğini `main` dalına yükle.
2. **Settings → Pages → Source** kısmını **GitHub Actions** yap.
3. **Settings → Secrets and variables → Actions → Variables** bölümüne `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` ekle.
4. Site `https://<kullanıcı>.github.io/daily/` adresinde yayınlanır. Telefonda Chrome'da "Ana ekrana ekle", iPhone'da Safari'de Paylaş → "Ana Ekrana Ekle".

## Simgeler

`python3 scripts/make-icons.py` (Pillow gerekir) `public/` içindeki simgeleri yeniden üretir.
