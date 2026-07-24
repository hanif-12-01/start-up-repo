# WATTWISE AI — IMPLEMENTATION PROMPT

## IT-DIAG-UI-01 — GSAP Frontend and Motion Foundation

Prompt ini merupakan keputusan dan persetujuan eksplisit Product Owner untuk menyisipkan satu task frontend bounded sebelum IT-DIAG-01B.

Task ini hanya memperbaiki visual frontend dan membangun motion foundation menggunakan GSAP pada halaman yang sudah benar-benar tersedia.

Task ini tidak mengubah status fase sebelumnya:

```text
IT-DIAG-00B — ACCEPTED
IT-DIAG-00C — ACCEPTED LOCALLY
IT-DIAG-01A — ACCEPTED LOCALLY
IT-DIAG-UI-01 — ACTIVE TASK
IT-DIAG-01B — NOT STARTED
```

Setelah task ini selesai, jangan mulai IT-DIAG-01B.

---

# 1. Identitas Eksekusi

```text
PROJECT=WattWise
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo

TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=f8513e49636266a9ebf5b55148eb8b1fb9159ae6
TARGET_BRANCH=feature/it-diag-ui-01-gsap-motion
TARGET_PHASE=IT-DIAG-UI-01

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_UI_01_GSAP_MOTION_IMPLEMENTATION_PROMPT.md

ALLOW_LOCAL_CODE=true
ALLOW_LOCAL_COMMIT=true
ALLOW_DOCS_TASK_ACTIVATION=true

ALLOW_PUSH=false
ALLOW_OPEN_PR=false
ALLOW_MERGE=false
ALLOW_DEPLOY=false
ALLOW_PRODUCTION_MIGRATION=false
ALLOW_NEON_RESOURCE_CREATION=false
ALLOW_PRODUCTION_SECRET=false
ALLOW_REAL_USER_DATA=false
ALLOW_ADVANCED_ML=false

REQUIRE_NODE_24=true
```

Task ini tidak memberi izin untuk push, pull request, merge, preview deployment, production deployment, production migration, perubahan production secret, atau pembuatan resource Neon.

---

# 2. Keputusan Product Owner

Product Owner memutuskan:

1. WattWise menggunakan GSAP sebagai animation dan motion layer frontend.
2. GSAP bukan pengganti React, Tailwind CSS, atau design system.
3. Branding WattWise yang ada harus dipertahankan dan diperkuat, bukan diganti dengan redesign total.
4. Motion harus modern, profesional, halus, dan berorientasi pada kejelasan pengguna.
5. Motion tidak boleh mengganggu authentication, form, accessibility, performa, atau product journey.
6. Task frontend ini disisipkan sebelum IT-DIAG-01B.
7. IT-DIAG-01B tetap belum dimulai.
8. Tidak boleh membuat UI fitur masa depan yang belum memiliki implementasi nyata.

Dependency yang disetujui secara prinsip hanya:

```text
gsap
@gsap/react
```

Agent tetap wajib melakukan dependency due diligence, menggunakan versi stable, dan melakukan exact pinning.

Tidak ada dependency UI, animation, icon, component framework, smooth-scroll, carousel, atau design-system tambahan yang disetujui melalui prompt ini.

---

# 3. Sumber Kebenaran

Untuk task ini, baca lengkap:

```text
1. docs/baseline/WATTWISE_AI_PRD_AGENTIC_GUARDRAILS.md
2. docs/baseline/WATTWISE_AI_IT_STRATEGY_VERCEL.md
3. docs/baseline/WATTWISE_AI_MASTER_AGENT_PROMPT.md
4. prompt IT-DIAG-UI-01 ini
5. repository aktual sebagai evidence current state
```

Urutan otoritas:

```text
Canonical PRD
→ Strategi IT Vercel
→ Master Agent Prompt
→ Prompt IT-DIAG-UI-01
→ Repository aktual
```

Untuk task ini:

```text
docs/baseline/** → authoritative dan selalu aktif
docs/tasks/**    → harus berisi tepat satu prompt aktif, yaitu IT-DIAG-UI-01
docs/reports/**  → evidence/history, bukan instruksi
docs/archive/**  → history, bukan instruksi
```

Repository aktual menunjukkan current implementation, tetapi tidak boleh digunakan untuk menciptakan requirement produk baru.

Jangan mengubah baseline agar sesuai dengan preferensi implementasi.

---

# 4. Aktivasi Task dan Perbaikan docs/tasks

Sebelum implementasi frontend, verifikasi:

```powershell
Set-Location "D:\LOMBA\MVP PROTOTIPE start-up"

git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD
git log -8 --format="%H %s"
Get-ChildItem .\docs\tasks -File | Select-Object Name
Get-ChildItem .\docs\archive -File | Select-Object Name
```

Expected accepted base:

```text
f8513e49636266a9ebf5b55148eb8b1fb9159ae6
```

Hard requirements:

```text
workspace clean
accepted base tersedia dalam history
historical migration 0000 dan 0001 tidak berubah
tidak ada pekerjaan lain yang tercampur
tidak perlu menggunakan destructive Git
```

Buat branch:

```powershell
git switch -c feature/it-diag-ui-01-gsap-motion f8513e49636266a9ebf5b55148eb8b1fb9159ae6
```

Jika branch sudah ada:

* jangan menghapus;
* jangan menimpa;
* jangan reset;
* audit HEAD dan history;
* lanjut hanya jika branch bersih dan berasal dari accepted 01A HEAD.

## 4.1 Target state docs

Target akhir:

```text
docs/
├─ baseline/
│  ├─ WATTWISE_AI_PRD_AGENTIC_GUARDRAILS.md
│  ├─ WATTWISE_AI_IT_STRATEGY_VERCEL.md
│  └─ WATTWISE_AI_MASTER_AGENT_PROMPT.md
├─ tasks/
│  └─ WATTWISE_AI_IT_DIAG_UI_01_GSAP_MOTION_IMPLEMENTATION_PROMPT.md
├─ reports/
└─ archive/
   ├─ WATTWISE_AI_IT_DIAG_00C_IMPLEMENTATION_PROMPT.md
   └─ WATTWISE_AI_IT_DIAG_01A_IMPLEMENTATION_PROMPT.md
```

Jika prompt 00C atau 01A masih berada di `docs/tasks`, pindahkan ke `docs/archive`.

Jangan mengubah isi prompt historis tersebut.

Jika file dengan nama sama sudah berada di archive:

* jangan menimpa secara buta;
* bandingkan isinya;
* jika identik, pertahankan satu salinan canonical;
* jika berbeda substantif, berhenti dengan `BLOCKED — DECISION REQUIRED`.

Simpan prompt IT-DIAG-UI-01 ini sebagai satu-satunya active task.

Buat commit docs-only terpisah:

```text
docs(tasks): activate IT-DIAG-UI-01 GSAP motion foundation
```

Activation commit harus:

* merupakan direct child atau descendant bersih dari accepted 01A HEAD;
* hanya mengubah task/archive administration;
* tidak mengubah baseline;
* tidak mengubah source code;
* tidak mengubah historical prompt content.

Setelah activation commit, implementation HEAD memang berada di atas accepted base. Jangan salah mengharuskan HEAD tetap identik dengan accepted base.

---

# 5. Objective

Membangun frontend dan motion foundation WattWise yang:

* modern;
* profesional;
* responsif;
* accessible;
* konsisten;
* terasa hidup tanpa berlebihan;
* mempertahankan branding yang sudah ada;
* menggunakan GSAP secara aman;
* tidak mengubah kontrak produk;
* tidak mengubah journey yang sudah diterima;
* tidak mengubah authorization atau tenant behavior;
* tidak membuat fitur masa depan palsu.

Motion harus membantu pengguna memahami:

* urutan informasi;
* perpindahan state;
* keberhasilan tindakan;
* hubungan antarbagian;
* fokus CTA;
* progress journey.

Motion bukan dekorasi berlebihan dan tidak boleh menghambat penyelesaian tugas pengguna.

---

# 6. Creative Direction

Gunakan arah visual:

```text
Clean energy-tech SaaS
Modern
Calm
Trustworthy
Focused
Premium tetapi tidak berlebihan
Mobile-first
Action-oriented
```

Karakter motion:

* lembut;
* cepat;
* purposeful;
* memiliki hierarchy;
* tidak berisik;
* tidak terasa seperti game;
* tidak menggunakan bounce berlebihan;
* tidak membuat elemen terus bergerak tanpa alasan;
* tidak memakai efek yang dapat menurunkan kepercayaan terhadap produk finansial/energi.

Contoh motion yang diperbolehkan:

* fade dan translate pendek pada page entrance;
* stagger ringan pada kartu;
* reveal section;
* CTA emphasis yang halus;
* hover/tap feedback;
* selected-card transition;
* progress transition;
* success-state reveal;
* layout transition yang tidak mengubah makna data;
* decorative energy pulse yang sangat ringan;
* background accent yang tidak mengurangi keterbacaan.

Contoh yang dilarang:

* scroll hijacking;
* smooth scroll yang mengganti native scrolling;
* animasi panjang sebelum form dapat digunakan;
* parallax berat;
* elemen penting terbang dari luar layar secara ekstrem;
* teks berkedip;
* infinite bouncing CTA;
* cursor custom;
* loading animation palsu;
* angka tagihan palsu;
* chart palsu;
* fake real-time data;
* fake AI processing;
* fake diagnosis;
* fake energy consumption;
* animasi yang menyembunyikan error;
* animasi yang menunda validation feedback;
* animasi pada password atau data sensitif.

---

# 7. Halaman yang Boleh Dikerjakan

Audit route aktual terlebih dahulu.

Task hanya boleh memperbaiki halaman yang sudah benar-benar tersedia dari fase accepted:

```text
/
 /register
 /login
 /plan
 /onboarding
 /businesses/new
 /setup
```

Termasuk komponen bersama yang digunakan halaman tersebut:

* header;
* navigation;
* logout control;
* page shell;
* authentication card;
* plan card;
* onboarding content;
* business form;
* setup summary;
* button;
* input;
* select;
* textarea jika sudah ada;
* form error;
* alert;
* badge;
* status;
* loading indicator;
* empty state yang memang sudah diperlukan;
* error boundary UI;
* not-found UI.

Jangan membuat route produk baru.

Jangan membuat halaman placeholder untuk roadmap masa depan.

Jangan mengubah route contract tanpa kebutuhan yang benar-benar terbukti.

---

# 8. Motion System

Bangun motion foundation reusable, tidak berupa GSAP code yang tersebar acak di setiap page.

Struktur dapat disesuaikan dengan repository, tetapi arah yang diperbolehkan:

```text
wattwise-vercel/src/
├─ components/
│  └─ motion/
│     ├─ page-reveal.tsx
│     ├─ reveal.tsx
│     ├─ stagger-group.tsx
│     ├─ interactive-motion.tsx
│     └─ reduced-motion.ts
├─ lib/
│  └─ motion/
│     ├─ gsap.ts
│     ├─ tokens.ts
│     └─ presets.ts
```

Nama file tidak wajib sama jika repository sudah memiliki convention yang lebih baik.

Motion tokens minimal:

```text
duration.fast
duration.normal
duration.slow

distance.xs
distance.sm
distance.md

ease.enter
ease.exit
ease.emphasized

stagger.tight
stagger.normal
```

Gunakan nilai yang restrained.

Pedoman awal:

```text
micro interaction: 120–220 ms
component transition: 200–450 ms
page/section reveal: 300–700 ms
stagger antaritem: 30–90 ms
```

Nilai final harus terasa wajar setelah runtime review.

Jangan membuat satu animasi yang mengunci interaksi halaman selama beberapa detik.

---

# 9. Aturan Integrasi GSAP dan React

Wajib:

1. Gunakan GSAP stable.
2. Pin exact version di `package.json`.
3. Commit `package-lock.json`.
4. Gunakan API resmi yang sesuai dengan package yang benar-benar diinstal.
5. Gunakan `@gsap/react` dan `useGSAP()` ketika sesuai.
6. Scope selector pada container/ref.
7. Pastikan animation cleanup saat component unmount.
8. Gunakan `contextSafe()` untuk callback atau event handler yang membuat animation setelah hook dijalankan.
9. Jangan menggunakan selector global yang dapat mengenai component lain.
10. Jangan membuat global timeline mutable untuk user-specific state.
11. Jangan menjalankan GSAP pada Server Component.
12. Batasi `"use client"` hanya pada leaf component yang membutuhkan browser animation.
13. Jangan mengubah root layout atau seluruh application shell menjadi Client Component hanya untuk GSAP.
14. Server Components tetap menjadi default.
15. Jangan memanggil internal API dari Server Component hanya untuk animation.
16. Jangan mengakses `window` atau `document` saat module import server.
17. Jangan menyebabkan hydration mismatch.
18. Jangan menyebabkan content flash yang membuat halaman tidak terbaca sebelum hydration.
19. Konten harus tetap tersedia ketika JavaScript gagal atau animation tidak berjalan.
20. Business logic tidak boleh berada dalam motion component.

Bila `@gsap/react` tidak kompatibel dengan current React/Next.js stable:

* jangan menggunakan package alternatif tidak resmi;
* gunakan `gsap.context()` dengan cleanup yang benar;
* laporkan evidence dan trade-off;
* berhenti bila solusi aman tidak tersedia.

Jangan memakai package `gsap-react` yang tidak resmi atau deprecated.

---

# 10. Plugin Policy

Default task ini hanya menggunakan:

```text
GSAP core
@gsap/react
```

`ScrollTrigger` hanya boleh digunakan pada landing page jika:

* benar-benar menambah hierarchy;
* tidak mengubah native scrolling;
* tidak diperlukan pada form;
* cleanup benar;
* reduced-motion tersedia;
* mobile performance tetap baik;
* tidak menyebabkan content hilang ketika JavaScript gagal.

Dilarang pada task ini:

```text
ScrollSmoother
Draggable
Inertia
Observer untuk scroll hijacking
MotionPath
MorphSVG
SplitText
ScrambleText
GSDevTools dalam production bundle
plugin tambahan yang tidak diperlukan
```

Jika plugin tambahan dianggap benar-benar perlu:

```text
BLOCKED — DECISION REQUIRED
```

Jangan memasangnya sebelum persetujuan Product Owner.

---

# 11. Reduced Motion dan Accessibility

Motion wajib progressive enhancement.

Hormati:

```css
@media (prefers-reduced-motion: reduce)
```

Ketika reduced motion aktif:

* nonaktifkan parallax;
* nonaktifkan decorative looping;
* hilangkan stagger panjang;
* gunakan transisi instan atau sangat singkat;
* jangan menghilangkan informasi;
* jangan mengubah urutan focus;
* jangan mengubah urutan DOM;
* jangan menghambat submit;
* jangan menghambat navigation.

Wajib mempertahankan:

* keyboard navigation;
* visible focus;
* semantic HTML;
* label input;
* error association;
* status announcement yang sesuai;
* contrast yang layak;
* target sentuh yang layak;
* screen-reader behavior;
* logical heading structure;
* immediate validation feedback.

Jangan menggunakan opacity `0` secara permanen sebagai default SSR untuk konten utama.

Jangan membuat form atau CTA tidak dapat digunakan sebelum timeline selesai.

Hover animation harus memiliki padanan focus yang sesuai jika feedback tersebut menyampaikan makna.

Motion tidak boleh menjadi satu-satunya cara menunjukkan:

* pilihan aktif;
* error;
* success;
* loading;
* progress;
* disabled state.

---

# 12. Performance Rules

Prioritaskan animasi pada:

```text
transform
opacity
```

Hindari animasi berat pada:

```text
width
height
top
left
box-shadow besar yang terus berubah
filter blur besar
layout property berulang
```

Wajib:

* mencegah layout shift;
* mencegah animation leak;
* mencegah timeline duplikat;
* menghindari listener yang tidak dibersihkan;
* menghindari unnecessary re-render;
* menghindari animasi pada setiap keystroke;
* tidak menjalankan animation loop saat tidak diperlukan;
* tidak membuat bundle client seluruh aplikasi membesar tanpa alasan;
* tidak mengimpor semua plugin GSAP melalui barrel besar jika hanya core yang dipakai;
* tidak memasukkan development tools ke production.

Laporkan:

* dependency version;
* package license;
* dependency count;
* client bundle impact yang terlihat dari build;
* route yang berubah menjadi Client Component;
* alasan setiap client boundary.

Jangan mengklaim performa meningkat tanpa pengukuran atau evidence.

---

# 13. Implementasi per Halaman

## 13.1 Landing Page

Boleh:

* hero entrance timeline;
* headline/subheadline reveal;
* CTA reveal;
* feature-card stagger;
* subtle energy-themed decorative motion;
* section reveal ringan;
* focus/hover feedback.

Wajib:

* CTA segera dapat digunakan;
* headline tersedia sebelum animation;
* tidak ada fake dashboard;
* tidak ada fake graph;
* tidak ada fake live-energy reading;
* tidak ada klaim produk baru;
* copy tetap mengikuti PRD.

## 13.2 Register dan Login

Boleh:

* authentication card reveal;
* heading/subheading reveal;
* subtle field-group entrance;
* button interaction feedback;
* error/success transition singkat.

Dilarang:

* menunda error;
* menganimasikan password;
* mengubah submit logic;
* mengubah auth endpoint;
* mengubah cookie/session;
* mengubah redirect contract;
* membuat user enumeration;
* menampilkan fake progress.

## 13.3 Plan Choice

Boleh:

* plan-card stagger;
* selected-state transition;
* hover/focus lift;
* CTA emphasis;
* confirmation transition.

Wajib:

* Free dan Pro Trial tetap setara dan jujur;
* tidak ada dark pattern;
* tidak ada harga baru;
* tidak ada fitur palsu;
* tidak ada plan conversion;
* trial tetap tepat 30 hari sesuai authoritative server state.

## 13.4 Onboarding

Boleh:

* content sequence;
* progress reveal;
* CTA transition;
* disclaimer emphasis yang halus.

Wajib:

* onboarding tetap singkat;
* disclaimer tetap terlihat;
* kWh tetap opsional;
* jangan menambahkan form panjang;
* jangan menambahkan questionnaire diagnosis.

## 13.5 Business Form

Boleh:

* section reveal;
* field-group stagger ringan;
* focus feedback;
* validation transition singkat;
* submit/success transition.

Wajib:

* owner tetap dari session;
* validation server tetap authoritative;
* enum dan field tidak berubah;
* jangan mengubah schema;
* jangan menambah portfolio;
* jangan menambah alamat lengkap jika tidak diperlukan;
* error tetap langsung terlihat.

## 13.6 Setup Summary

Boleh:

* summary-card reveal;
* status stagger;
* completion emphasis;
* subtle success transition.

Wajib:

* jangan membuat dashboard palsu;
* jangan membuat chart;
* jangan membuat input tagihan palsu;
* jangan membuat tombol yang tidak berfungsi;
* boleh menyatakan secara jujur bahwa input tagihan belum tersedia.

---

# 14. In Scope

Task ini mencakup:

```text
GSAP dependency due diligence
GSAP core installation
@gsap/react installation jika kompatibel
exact version pinning
package-lock diperbarui
motion token foundation
reusable motion primitives
reduced-motion handling
current landing page polish
current auth UI polish
current plan UI polish
current onboarding UI polish
current business form polish
current setup summary polish
responsive correction yang terkait perubahan UI
accessibility correction yang terkait perubahan UI
component tests
runtime smoke
regression tests
build verification
local commits
final implementation report
```

Task ini boleh memperbaiki styling existing yang jelas rusak atau tidak konsisten selama:

* tidak mengubah branding secara total;
* tidak mengubah product requirement;
* tidak mengubah copy substantif;
* tidak mengubah route contract;
* tidak mengubah server behavior;
* tidak memperluas fitur.

---

# 15. Out of Scope

Dilarang mengerjakan:

```text
IT-DIAG-01B
input tagihan
previous period
cost per day
normalisasi periode
perbandingan biaya
kWh calculation
diagnosis
questionnaire
candidate generator
candidate ranking
guided inspection
recommendation
action plan
outcome tracking
dashboard produk penuh
grafik bisnis
report
PDF
analytics lengkap
entitlement lengkap
plan conversion
payment
subscription production
OAuth
passkey
2FA
SSO
portfolio/multi-location
IoT
advanced ML
production deploy
production migration
Neon resource creation
```

Dilarang mengubah:

```text
wattwise-laravel/**
.github/**
bengkel/**
docs/baseline/**
historical migration 0000
historical migration 0001
accepted business/auth schema
authentication semantics
trial semantics
journey semantics
tenant ownership semantics
```

Membaca legacy diperbolehkan bila diperlukan untuk mempertahankan branding atau copy yang sesuai baseline. Menulis ke legacy dilarang.

---

# 16. File Scope

Setelah task activation selesai, source implementation hanya boleh berada di:

```text
wattwise-vercel/**
```

File yang mungkin berubah:

```text
wattwise-vercel/package.json
wattwise-vercel/package-lock.json
wattwise-vercel/src/app/**
wattwise-vercel/src/components/**
wattwise-vercel/src/features/**
wattwise-vercel/src/lib/motion/**
wattwise-vercel/src/styles/**
wattwise-vercel/tests/**
wattwise-vercel/README.md
```

Jangan mengubah file server, repository, policy, schema, migration, atau auth configuration kecuali diperlukan untuk memperbaiki import/type error yang secara langsung muncul akibat extraction presentational component.

Perubahan server-side substantif adalah hard stop.

---

# 17. Dependency Due Diligence

Sebelum instalasi, laporkan:

```text
package
current stable version
dist-tag
license
publisher/repository
dependency count
maintenance signal
security signal
bundle/runtime relevance
alternatives
reason selected
```

Periksa setidaknya:

```text
gsap
@gsap/react
```

Alternatif yang harus dipertimbangkan secara singkat:

```text
CSS transitions/keyframes only
Web Animations API
existing Tailwind animation utilities
```

Keputusan Product Owner telah memilih GSAP sebagai motion layer, tetapi due diligence tetap wajib untuk memastikan package yang diinstal adalah official, stable, dan kompatibel.

Gunakan exact version:

```json
{
  "dependencies": {
    "gsap": "<exact-stable-version>",
    "@gsap/react": "<exact-stable-version>"
  }
}
```

Jangan memakai caret atau tilde jika repository policy menggunakan exact pinning.

Jangan memasang package dengan nama mirip yang bukan package official.

Jangan menjalankan:

```text
npm audit fix --force
```

Empat moderate vulnerability existing harus tetap dilaporkan apa adanya jika masih muncul.

High atau critical vulnerability baru yang berasal dari dependency task ini adalah hard stop jika tidak ada penyelesaian aman.

---

# 18. Test Plan

## 18.1 Unit dan Component Tests

Tambahkan test yang relevan untuk:

* motion preset tidak mengubah content;
* reduced-motion menghasilkan fallback aman;
* component tetap merender konten tanpa animation;
* animation wrapper mempertahankan semantic element;
* interactive control tetap keyboard accessible;
* loading/disabled state tetap bekerja;
* error tetap tampil;
* plan selection tetap bekerja;
* onboarding CTA tetap bekerja;
* business form tetap dapat digunakan;
* cleanup terjadi ketika component unmount jika dapat diuji dengan stabil;
* tidak terjadi duplicate animation initialization.

Jangan membuat brittle test berdasarkan frame-by-frame timing.

Jangan menguji internal GSAP implementation yang tidak relevan.

Fokus pada perilaku pengguna dan cleanup.

## 18.2 Regression Tests

Seluruh test existing IT-DIAG-00B, 00C, dan 01A harus tetap lulus.

Wajib memastikan:

* register tetap bekerja;
* login tetap bekerja;
* logout tetap bekerja;
* plan selection tetap server-backed;
* trial replay tidak memperpanjang expiry;
* onboarding completion tetap server-backed;
* business owner tetap dari session;
* anonymous route protection tetap bekerja;
* user A tidak dapat mengakses data user B;
* historical migrations tetap identik.

## 18.3 Runtime Smoke

Jalankan pada Node.js 24.

Verifikasi setidaknya:

```text
GET /
GET /register
GET /login

register synthetic user
redirect ke /plan
pilih Free atau Pro Trial
buka /onboarding
selesaikan onboarding
buat synthetic business
buka /setup
logout
```

Review runtime secara manual atau melalui E2E untuk:

* page entrance;
* no content flash;
* no hydration warning;
* no console error;
* keyboard use;
* focus state;
* reduced-motion;
* mobile viewport;
* desktop viewport;
* no blocked interaction;
* no duplicate animation;
* navigation tetap cepat;
* form tetap dapat digunakan sebelum animation selesai.

Gunakan data sintetis.

Jangan mencetak password, cookie, session token, secret, database URL, alamat lengkap, atau data asli.

## 18.4 Responsive Review

Minimal viewport:

```text
360px mobile
768px tablet
1280px desktop
```

Periksa:

* overflow horizontal;
* clipped text;
* CTA visibility;
* form usability;
* card layout;
* plan selection;
* navigation;
* motion distance;
* reduced-motion;
* touch interaction.

## 18.5 Accessibility Review

Periksa:

* keyboard-only journey;
* visible focus;
* label association;
* heading order;
* error discoverability;
* reduced-motion;
* animation tidak mengubah DOM order;
* motion bukan satu-satunya status indicator;
* screen-reader content tidak diduplikasi oleh decorative element.

Decorative animated element harus menggunakan semantic treatment yang aman, seperti `aria-hidden`, bila memang tidak membawa informasi.

---

# 19. Quality Gates

Semua command Node/npm harus menggunakan Node.js 24.

Jalankan fail-fast:

```text
npm ci
npm audit
npm audit --omit=dev
npm run test
npm run test:integration
npm run typecheck
npm run lint
npm run build
```

Jika repository memiliki script berikut dan relevan, jalankan:

```text
npm run test:component
npm run test:e2e
```

Jangan membuat script palsu hanya agar checklist terlihat lengkap.

Build harus:

* lulus tanpa database aktif;
* tidak memiliki hydration error;
* tidak memiliki import GSAP pada server yang salah;
* tidak membundel development-only tool;
* tidak membutuhkan production secret.

Jangan:

* menurunkan assertion;
* menghapus regression test;
* skip test;
* menyembunyikan exit code;
* memakai `|| true`;
* memotong output penting;
* mengklaim pass tanpa command dan exit code.

Setelah seluruh gate:

```powershell
git diff --check
git status --short --untracked-files=all
git diff --name-only <approved-base>..HEAD
```

---

# 20. Docker Safety

Gunakan Docker Node 24 terpisah untuk build/test.

Diperbolehkan:

* `node:24-slim`;
* bind mount hanya `wattwise-vercel`;
* volume task-specific untuk `node_modules`;
* volume task-specific untuk `.next`;
* PostgreSQL disposable jika integration/runtime test membutuhkannya;
* synthetic credentials.

Dilarang:

```text
docker system prune
docker volume prune
docker builder prune
mount Docker socket
privileged container
host network
mount seluruh drive
mount home directory
mount secret store
menghapus resource yang tidak dibuat task
build dalam production-like server container yang sedang aktif
```

Cleanup hanya container, network, dan volume yang jelas dibuat oleh task ini.

Jangan menggunakan fixed container name tanpa memeriksa collision dan ownership.

---

# 21. Git Rules

Dilarang:

```text
git reset --hard
git clean
git checkout HEAD -- .
git restore seluruh workspace tanpa review
rebase
amend
force push
history rewrite
auto merge
branch deletion
mengubah main langsung
push
PR
merge
deploy
```

Rollback Git harus menggunakan:

```text
git revert <commit>
```

Buat 1–3 implementation commit lokal yang logis setelah quality gate relevan lulus.

Contoh:

```text
feat(ui): add GSAP motion foundation and reduced-motion support
feat(ui): apply bounded motion to accepted WattWise journey pages
test(ui): verify accessible motion and journey regressions
```

Jangan mengarang SHA. Salin SHA dari `git rev-parse` atau `git log`.

---

# 22. Hard Stops

Berhenti dengan:

```text
BLOCKED — DECISION REQUIRED
```

jika:

1. accepted base tidak ditemukan;
2. workspace kotor dengan perubahan tidak dikenal;
3. branch divergen;
4. 00C dan 01A active task files berbeda dari history yang diharapkan;
5. baseline docs hilang atau konflik;
6. task activation membutuhkan overwrite file berbeda;
7. package GSAP yang ditemukan bukan official;
8. versi stable tidak tersedia;
9. GSAP tidak kompatibel dengan current React/Next.js;
10. dependency baru selain `gsap` dan `@gsap/react` diperlukan;
11. high/critical vulnerability baru tidak memiliki fix aman;
12. implementasi membutuhkan perubahan auth;
13. implementasi membutuhkan perubahan schema;
14. implementasi membutuhkan migration;
15. implementasi mengubah trial semantics;
16. implementasi mengubah journey semantics;
17. implementasi melemahkan tenant isolation;
18. animation membutuhkan seluruh root layout menjadi Client Component;
19. build membutuhkan database aktif;
20. hydration mismatch tidak dapat diselesaikan;
21. reduced-motion tidak dapat dipenuhi;
22. accessibility regression ditemukan;
23. runtime interaction terblokir oleh animation;
24. scope mulai masuk IT-DIAG-01B atau fitur masa depan;
25. satu task menjadi terlalu besar.

Format:

```text
BLOCKED — DECISION REQUIRED

Reason:
Evidence:
Affected requirement:
Risk:
Safe option A:
Safe option B:
Recommendation:
Changes already performed:
No changes performed after hard stop:
```

---

# 23. Definition of Done

IT-DIAG-UI-01 belum siap direview sebelum:

```text
[ ] branch berasal dari accepted 01A HEAD
[ ] exactly one active task
[ ] 00C dan 01A berada di archive sebagai history
[ ] baseline tidak berubah
[ ] historical migrations 0000 dan 0001 identik
[ ] hanya docs activation dan wattwise-vercel yang berubah
[ ] GSAP official stable digunakan
[ ] @gsap/react official stable digunakan atau alasan aman diberikan
[ ] dependency dipin exact
[ ] package-lock diperbarui
[ ] dependency due diligence dilaporkan
[ ] reusable motion foundation tersedia
[ ] motion tidak tersebar tanpa abstraction
[ ] Server Components tetap default
[ ] client boundaries minimal
[ ] GSAP cleanup benar
[ ] reduced-motion didukung
[ ] native scrolling dipertahankan
[ ] tidak ada scroll hijacking
[ ] tidak ada fake data
[ ] tidak ada fake chart
[ ] tidak ada dead button
[ ] landing existing dipoles secara bounded
[ ] register/login existing dipoles secara bounded
[ ] plan existing dipoles secara bounded
[ ] onboarding existing dipoles secara bounded
[ ] business form existing dipoles secara bounded
[ ] setup summary existing dipoles secara bounded
[ ] responsive mobile/tablet/desktop
[ ] keyboard navigation bekerja
[ ] visible focus tersedia
[ ] content tetap tersedia tanpa animation
[ ] tidak ada hydration error
[ ] tidak ada console error
[ ] tidak ada layout shift besar akibat animation
[ ] auth semantics tidak berubah
[ ] journey semantics tidak berubah
[ ] trial semantics tidak berubah
[ ] tenant isolation tidak berubah
[ ] unit/component tests relevan lulus
[ ] integration regression lulus
[ ] runtime smoke lulus
[ ] typecheck lulus
[ ] lint lulus
[ ] build lulus
[ ] npm audit dilaporkan dengan exit code
[ ] Docker resource task dibersihkan
[ ] git diff --check bersih
[ ] workspace clean setelah commit
[ ] no push/PR/merge/deploy
[ ] risk dan rollback dilaporkan
```

---

# 24. Final Report Format

Berikan laporan:

```text
1. Status
2. Selected Task
3. Product Owner Decision Applied
4. Repository Preflight
5. Accepted Base
6. Branch
7. Task Activation Result
8. docs/tasks Final State
9. docs/archive Final State
10. Commits Created
11. Summary
12. Existing UI Audit
13. Visual Direction Applied
14. Motion Principles
15. Dependency Due Diligence
16. GSAP Version
17. @gsap/react Version
18. License Review
19. Dependency Tree
20. Bundle Impact
21. Client Component Boundaries
22. Motion Architecture
23. Motion Tokens
24. Reusable Motion Components
25. Reduced-Motion Implementation
26. Landing Page Result
27. Register Result
28. Login Result
29. Plan Result
30. Onboarding Result
31. Business Form Result
32. Setup Summary Result
33. Responsive Review
34. Accessibility Review
35. Keyboard Review
36. Hydration Review
37. Runtime Console Review
38. Authentication Regression
39. Journey Regression
40. Trial Regression
41. Tenant Regression
42. Tests Actually Run
43. Exact Test Results
44. npm Audit Result and Exit Code
45. Typecheck Result
46. Lint Result
47. Build Result
48. Runtime Smoke Result
49. Node Version
50. PostgreSQL Test Environment
51. Neon Dev Verification Status
52. Docker Cleanup
53. Changed Files
54. Created Files
55. Deleted Files
56. Protected Directory Diff
57. Historical Migration Hash/Diff Evidence
58. Known Risks
59. Git Rollback
60. Dependency Rollback
61. Remaining Scope
62. IT-DIAG-01B Status
63. Decision Needed
64. Final Verdict
```

Final verdict hanya boleh:

```text
VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW

VERIFIED LOCALLY — NEON DEV VERIFICATION PENDING

NOT VERIFIED — CORRECTION REQUIRED

BLOCKED — DECISION REQUIRED
```

Jangan menulis:

```text
IT-DIAG-UI-01 ACCEPTED
```

Hanya Product Owner yang dapat menerima task.

Setelah final report:

* berhenti;
* jangan mulai IT-DIAG-01B;
* jangan push;
* jangan membuka PR;
* jangan merge;
* jangan deploy.

---

# 25. Instruksi Eksekusi Ringkas

Buka workspace:

```text
D:\LOMBA\MVP PROTOTIPE start-up
```

Baca lengkap:

```text
docs/baseline/WATTWISE_AI_PRD_AGENTIC_GUARDRAILS.md
docs/baseline/WATTWISE_AI_IT_STRATEGY_VERCEL.md
docs/baseline/WATTWISE_AI_MASTER_AGENT_PROMPT.md
```

Verifikasi repository dan accepted base:

```text
f8513e49636266a9ebf5b55148eb8b1fb9159ae6
```

Aktifkan tepat satu task:

```text
IT-DIAG-UI-01 — GSAP Frontend and Motion Foundation
```

Pindahkan prompt 00C dan 01A dari `docs/tasks` ke `docs/archive` jika masih aktif, tanpa mengubah isi historisnya.

Implementasikan GSAP hanya pada halaman existing:

```text
/
 /register
 /login
 /plan
 /onboarding
 /businesses/new
 /setup
```

Pertahankan:

* authentication;
* journey;
* trial;
* onboarding state;
* business ownership;
* tenant isolation;
* server-side validation;
* Server Components default;
* native scrolling;
* accessibility;
* responsive behavior;
* safe wording.

Jangan mengerjakan IT-DIAG-01B atau fitur roadmap berikutnya.

Setelah task activation, implementation, test, build, runtime smoke, local commit, cleanup, dan final report selesai, berhenti dan tunggu keputusan Product Owner.
