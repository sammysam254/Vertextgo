# VERTEX GO 🔒
### Device Finance Platform — Pay-As-You-Go Phone Management System

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERTEX GO SYSTEM                          │
├──────────────────┬──────────────────────┬───────────────────────┤
│   WEB DASHBOARD  │   SUPABASE BACKEND   │   ANDROID APP         │
│   (React/Netlify)│   (DB + Auth + API)  │   (Device Owner)      │
│                  │                      │                        │
│  Super Admin     │  customers           │  Customer Login        │
│  ├─ Create users │  devices             │  Loan Dashboard        │
│  ├─ Assign roles │  loans               │  Lock Screen           │
│  └─ View reports │  payments            │  Background Service    │
│                  │  device_commands     │  WorkManager fallback  │
│  Admin/Enroller  │  enrollment_tokens   │  BootReceiver          │
│  ├─ Enroll cust  │  profiles            │  Survives factory reset│
│  ├─ Link device  │                      │  (when Device Owner)   │
│  ├─ Record pay   │  Edge Functions:     │                        │
│  └─ Lock/unlock  │  lock_overdue_devices│                        │
│                  │  (runs daily)        │                        │
│  Customer View   │                      │                        │
│  └─ Loan status  │                      │                        │
└──────────────────┴──────────────────────┴───────────────────────┘
```

---

## Quick Start

### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase_schema.sql`
3. Go to **Storage** → create a bucket called `id-images` (private)
4. Copy your **Project URL** and **anon key** from Settings → API

### 2. Create Super Admin User
In Supabase dashboard → **Authentication → Users → Add user**:
```
Email: superadmin@vertexgo.com
Password: <strong password>
```
Then in **SQL Editor**:
```sql
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, 'Super Admin', 'super_admin'
FROM auth.users WHERE email = 'superadmin@vertexgo.com';
```

### 3. GitHub Repository Setup
1. Create a new GitHub repository named `vertexgo`
2. Go to **Settings → Secrets and variables → Actions**
3. Add these secrets:

| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NETLIFY_AUTH_TOKEN` | From Netlify → User Settings → OAuth |
| `NETLIFY_SITE_ID` | From Netlify → Site Settings → General |
| `KEYSTORE_BASE64` | Output of `generate_keystore.sh` |
| `KEY_ALIAS` | `vertexgo` |
| `KEY_PASSWORD` | Your key password |
| `STORE_PASSWORD` | Your store password |

### 4. Push from Termux (First Time)
```bash
# In Termux on your Android phone:
pkg install git curl
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/vertexgo/main/termux_setup.sh
bash termux_setup.sh
```

### 5. Push Updates (Every Time)
```bash
cd ~/vertexgo
bash push.sh "added new feature"
```

---

## Android Device Enrollment Flow

```
ENROLLER (Web Admin)                    PHONE BEING ENROLLED
       │                                        │
       │  1. Enroll customer (upload ID)        │
       │  2. Select customer                    │
       │  3. Enter device IMEI + daily rate     │
       │  4. Click "Generate Enrollment Token"  │
       │                                        │
       │  ← Token + Instructions shown          │
       │                                        │
       │                          Factory reset phone
       │                          Tap screen 6x on welcome
       │                          → DPC enrollment mode
       │                                        │
       │   Token/QR given to technician ──────→ Scan QR / Enter token
       │                                        │
       │                          VertexGo APK auto-installs
       │                          (from GitHub Release URL in QR)
       │                                        │
       │                          Customer logs in with ID number
       │                                        │
       │   ← Device auto-linked in Supabase     │
       │                                        │
       │  System now:                           │
       │  • Polls every 60s for commands        │
       │  • Auto-locks if payment overdue       │
       │  • Auto-unlocks when payment recorded  │
```

---

## QR Code Enrollment Payload

The enrollment token in Step 3 should be embedded in a QR with this JSON:

```json
{
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
    "com.vertexgo.app/.VertexGoDeviceAdminReceiver",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION":
    "https://github.com/YOUR_USERNAME/vertexgo/releases/latest/download/VertexGo_release.apk",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM":
    "YOUR_APK_SHA256_CHECKSUM",
  "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false,
  "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
    "enrollment_token": "TOKEN_FROM_ADMIN_DASHBOARD"
  }
}
```

Generate this QR at: https://qr-code-generator.com (use JSON mode)

---

## How Locking Survives Factory Reset

When enrolled as **Device Owner** via the DPC/QR flow:
- The app is installed in the **device owner profile**
- Factory reset by user **does NOT remove Device Owner enrollment** if `WIPE_RESET_PROTECTION_DATA` flag is not set
- The app reinstalls automatically from our GitHub Releases URL
- `BootReceiver` fires on every restart to resume monitoring
- `WorkManager` persists lock check jobs across reboots

---

## Daily Lock Automation

Set up a Supabase Edge Function or pg_cron job to call `lock_overdue_devices()` daily:

```sql
-- In Supabase → Extensions → enable pg_cron, then:
SELECT cron.schedule(
  'lock-overdue-daily',
  '0 6 * * *',   -- 6 AM daily
  'SELECT lock_overdue_devices();'
);
```

---

## Roles Summary

| Role | Permissions |
|------|------------|
| **Super Admin** | Create/remove users, assign roles, full reports |
| **Admin** | Enroll customers, link devices, record payments, lock/unlock |
| **Enroller** | Enroll customers, generate enrollment tokens only |

---

## File Structure
```
vertexgo/
├── .github/workflows/build.yml   ← GitHub Actions CI/CD
├── web/                          ← React web dashboard
│   └── src/
│       ├── pages/
│       │   ├── LoginPage.js
│       │   ├── SuperAdminDashboard.js
│       │   ├── AdminDashboard.js
│       │   └── CustomerDashboard.js
│       └── lib/supabase.js
├── android/                      ← Android Device Owner app
│   └── app/src/main/java/com/vertexgo/app/
│       ├── VertexGoDeviceAdminReceiver.kt
│       ├── LockMonitorService.kt
│       ├── LockCheckWorker.kt
│       ├── BootReceiver.kt
│       ├── MainActivity.kt
│       ├── LockScreenActivity.kt
│       ├── SecurePrefs.kt
│       └── SupabaseClient.kt
├── supabase_schema.sql           ← Run this in Supabase SQL Editor
├── netlify.toml                  ← Netlify deployment config
├── termux_setup.sh               ← First-time Termux setup
├── push.sh                       ← Quick push from Termux
└── generate_keystore.sh          ← Generate signing keystore
```
