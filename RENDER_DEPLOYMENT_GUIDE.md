# SocietySync — Render Deployment Guide
# रेंडर (Render) पर डिप्लॉय करने की पूरी गाइड (Hindi + English)

यह गाइड आपको **SocietySync** को [Render.com](https://render.com) पर आसानी से डिप्लॉय करने के सभी स्टेप्स सिखाती है।

---

## 📋 सारांश (Overview)

SocietySync एक **Full-Stack Node.js (Express) + React (Vite) + TypeScript** ऐप्लिकेशन है:
- **Frontend:** React 19, Tailwind CSS, Lucide Icons, Recharts
- **Backend:** Express 4 REST API (`/api/v1/*`)
- **AI Engine:** Google Gemini API (`@google/genai`)
- **Database:** Persistent JSON Store (`.data/societysync-db.json`)
- **Build Output:** `dist/index.html` (Frontend) और `dist/server.js` (Compiled Node Server)

---

## 🚀 डिप्लॉयमेंट के 2 तरीके (2 Easy Methods)

### तरीका 1: Render Blueprint (1-Click ऑटोमैटिक - सबसे आसान)

अगर आपके गिटहब रिपोजिटरी में `render.yaml` मौजूद है, तो Render सब कुछ अपने आप कॉन्फ़िगर कर लेता है:

1. [dashboard.render.com](https://dashboard.render.com) पर लॉगिन करें।
2. **New +** बटन पर क्लिक करें और **Blueprint** चुनें।
3. अपनी गिटहब रिपोजिटरी (`raghavguptagit/java-project`) को कनेक्ट करें।
4. Render अपने आप `render.yaml` फ़ाइल डिटेक्ट करेगा।
5. **Apply** पर क्लिक करें — Render अपने आप ऐप्लिकेशन बिल्ड और डिप्लॉय कर देगा!

---

### तरीका 2: Render Manual Web Service (मैनुअल तरीका)

अगर आप मैन्युअली सेट अप करना चाहते हैं:

#### स्टेप 1: रिपोजिटरी पुश करें
सुनिश्चित करें कि आपके लेटेस्ट कोड चेंजेस आपके GitHub रिपोजिटरी पर पुश हो चुके हैं:
```bash
git add .
git commit -m "Configure production build and Render deployment"
git push origin main
```

#### स्टेप 2: Render पर नया Web Service बनाएं
1. [dashboard.render.com](https://dashboard.render.com) पर जाएं।
2. **New +** बटन पर क्लिक करें और **Web Service** चुनें।
3. **Build and deploy from a Git repository** चुनें और **Next** दबाएं।
4. अपनी रिपोजिटरी **raghavguptagit/java-project** सिलेक्ट करें।

#### स्टेप 3: सेटिंग्स भरें (Configure Settings)
| फील्ड (Field) | क्या भरें (Value) |
|---|---|
| **Name** | `societysync` (या अपनी पसंद का नाम) |
| **Region** | `Singapore` (एशिया के लिए बेस्ट) या `Oregon (US West)` |
| **Branch** | `main` (या आपकी एक्टिव ब्रांच) |
| **Root Directory** | *(खाली छोड़ें / Leave blank)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

#### स्टेप 4: एनवायरनमेंट वैरिएबल्स (Environment Variables) जोड़ें
**Advanced** सेक्शन में जाकर **Add Environment Variable** पर क्लिक करें और ये वैल्यूज जोड़ें:

| Key | Value | विवरण |
|---|---|---|
| `NODE_ENV` | `production` | प्रोडक्शन मोड इनेबल करता है |
| `JWT_SECRET` | *(कोई भी लंबा रैंडम स्ट्रिंग, उदा. `my_secure_secret_key_987654321`)* | लॉगिन टोकन साइन करने के लिए |
| `GEMINI_API_KEY` | *(वैकल्पिक / Optional: आपका Gemini API Key)* | AI असिस्टेंट के लिए (Google AI Studio से फ्री लें) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | AI मॉडल का नाम |

*(नोट: Render `PORT` वैरिएबल अपने आप सेट करता है, सर्वर उसे ऑटोमैटिकली डिटेक्ट कर लेता है।)*

#### स्टेप 5: हेल्थ चेक (Health Check)
**Advanced** सेटिंग्स में:
- **Health Check Path:** `/api/v1/health`

#### स्टेप 6: डिप्लॉय करें
- **Create Web Service** बटन पर क्लिक करें।
- बिल्ड लॉग्स चलेंगे (करीब 1-2 मिनट)।
- जब `==> Your service is live 🎉` दिखे, तो आपको ऊपर एक URL मिलेगा:
  `https://societysync-xxxx.onrender.com`

---

## 🐳 तरीका 3: Docker से डिप्लॉय करना (वैकल्पिक)

यदि आप Docker इस्तेमाल करना चाहते हैं:
1. Render पर **New + > Web Service** चुनें।
2. अपनी रिपोजिटरी कनेक्ट करें।
3. **Runtime** में `Docker` चुनें।
4. Render रूट डायरेक्टरी में मौजूद `Dockerfile` को ऑटोमैटिकली इस्तेमाल करके इमेज बना लेगा।

---

## 💾 डेटा स्टोरेज और पर्सिस्टेंस (Data Persistence)

- **Render Free Tier:** फ्री टियर पर सर्वर के स्लीप/रीस्टार्ट होने पर डिस्क डेटा रीसेट हो सकता है।
- **परमानेंट डेटा (Persistent Disk - Paid Starter Tier):**
  अगर आप चाहते हैं कि बिल, कंप्लेंट और विज़िटर डेटा हमेशा सेव रहे:
  1. Render सर्विस सेटिंग्स में **Disks > Add Disk** पर जाएं।
  2. **Mount Path:** `/var/data` सेट करें (Size: 1 GB)।
  3. Environment Variable जोड़ें: `DATA_DIR=/var/data`।
  अब आपका सारा डेटा परमानेंट स्टोर रहेगा।

---

## 🔑 टेस्ट करने के लिए रेडीमेड डेमो लॉगिन (Demo Credentials)

डिप्लॉय होने के बाद आप इन 5 अलग-अलग रोल्स से लॉगिन करके टेस्ट कर सकते हैं:

| रोल (Role) | ईमेल (Email) | पासवर्ड (Password) | काम (Permissions) |
|---|---|---|---|
| **Society Admin** | `admin@greenvalley.in` | `Admin@123` | पूरे सिस्टम का फुल कंट्रोल, बिल बनाना, पेमेंट वेरिफाई करना, कंप्लेंट असाइन करना |
| **Resident (Flat A-101)** | `resident@greenvalley.in` | `Resident@123` | अपने फ्लैट के बिल देखना/पे करना, कंप्लेंट दर्ज करना, विज़िटर पास बनाना |
| **Resident (Flat A-102)** | `meera.iyer@greenvalley.in` | `Resident@123` | फ्लैट A-102 के बिल, क्लबहाउस बुकिंग |
| **Committee Member** | `committee@greenvalley.in` | `Committee@123` | एक्सपेंस अप्रूवल, ऑडिट लॉग, नोटिस पब्लिश करना |
| **Security Guard** | `security@greenvalley.in` | `Security@123` | मेन गेट पर विज़िटर चेक-इन / चेक-आउट, वॉक-इन रिक्वेस्ट |
| **Maintenance Staff** | `staff@greenvalley.in` | `Staff@123` | असाइन की गई प्लंबिंग/इलेक्ट्रिकल कंप्लेंट इन-प्रोग्रेस या रिज़ॉल्व करना |

---

## 🧪 डिप्लॉयमेंट वेरिफिकेशन चेकलिस्ट (Verification Checklist)

डिप्लॉय करने के बाद ये 5 चीजें चेक करें:
- [ ] **Health Check:** `https://your-app.onrender.com/api/v1/health` पर `{ "status": "ok" }` दिखना चाहिए।
- [ ] **Login Screen:** वेबसाइट खोलने पर SocietySync का क्लीन लॉगिन पेज और Quick Demo बटन दिखने चाहिए।
- [ ] **Admin Login:** Admin से लॉगिन करें और Dashboard KPI कार्ड्स, चार्ट्स, फ्लैट्स लिस्ट देखें।
- [ ] **Billing & Payment:** Bills & Payments टैब में जाकर किसी बिल की रसीद या स्टेटस चेक करें।
- [ ] **AI Assistant:** AI Assistant टैब में जाकर कोई सवाल पूछें (उदा. "What are the clubhouse rules?").

---

## 🛠️ सामान्य समस्याएं और समाधान (Troubleshooting)

### Q: `npm error ERESOLVE could not resolve peerOptional esbuild`
- **कारण:** `esbuild` और `vite` के बीच वर्शन कॉन्फ्लिक्ट।
- **समाधान:** रिपोजिटरी में `.npmrc` फ़ाइल (जिसमें `legacy-peer-deps=true` है) और `esbuild@^0.28.0` पहले से कॉन्फ़िगर कर दिया गया है। अगर आप मैन्युअल कमांड चला रहे हैं तो हमेशा `npm install --legacy-peer-deps` का उपयोग करें।

### Q: `Cannot find module '@rolldown/binding-linux-x64-musl'` (Docker Build Error)
- **कारण:** Alpine Linux `musl` C library का उपयोग करता है, जबकि `rolldown` (Vite 8 का बंडलर) glibc बाइनरी खोजता है।
- **समाधान:** `Dockerfile` में बेस इमेज को `node:22-alpine` से बदलकर मानक **`node:22-slim` (Debian glibc)** कर दिया गया है, जो सभी native bindings को बिना किसी एरर के सपोर्ट करता है।

### Q: Render पर डेटा रीस्टार्ट होने पर रीसेट हो जाता है?
- **कारण:** Render Free Tier पर स्टोरेज एफेमरल (अस्थायी) होता है।
- **समाधान:** परमानेंट डेटा के लिए Render Dashboard में 1 GB Persistent Disk जोड़ें (Mount Path: `/var/data`) और `DATA_DIR=/var/data` सेट करें।
