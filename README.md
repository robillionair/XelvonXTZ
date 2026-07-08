# Xelvon XPT — Robillionair.com

A premium, ultra-futuristic sci-fi AI chat application gated by lead capture.

## Project Structure

```
robillionair/
├── public/                 # Static frontend pages
│   ├── index.html          # Main gate & chat app markup
│   ├── style.css           # Futuristic glassmorphism styles
│   ├── app.js              # Streaming client code and state transitions
│   └── privacy.html        # Clean, privacy policy document
├── worker/                 # Cloudflare Worker code
│   ├── src/index.ts        # Chat SSE and email subscription APIs
│   └── wrangler.toml       # Worker configuration and KV bindings
├── .gitignore              # Ignored paths
├── .env.example            # Reference variables
└── README.md               # Setup & deployment guides (this file)
```

---

## Local Development Setup

To run this application locally, you will need [Node.js](https://nodejs.org/) installed.

### 1. Configure Local Secret Environment
Create a `.dev.vars` file in the `worker/` directory for local development secrets:
```bash
# Add this inside worker/.dev.vars
OPENROUTER_API_KEY=your_actual_openrouter_api_key
MODEL_ID=google/gemini-2.5-flash
```

### 2. Start the Backend Worker
Navigate to the `worker/` directory, install packages, and spin up Wrangler dev:
```bash
cd worker
npm install typescript @cloudflare/workers-types --save-dev
npx wrangler dev
```
By default, the Worker will run at `http://localhost:8787`.

### 3. Launch the Frontend
You can serve the `public/` directory using any local static server (e.g. `npx serve public/` or VS Code Live Server extension).
* To simulate local communication, modify `public/app.js` API calls or map the port route proxy.
* For simple cross-origin testing, the Cloudflare Worker allows request origins matching `http://localhost:*`.

---

## Cloudflare Deployment

### 1. Create a Cloudflare KV Namespace
Create the KV store namespace to hold operator emails:
```bash
npx wrangler kv:namespace create XELVON_EMAILS
```
Copy the generated ID and update `id` under `[[kv_namespaces]]` in [worker/wrangler.toml](file:///C:/Users/Ah92k/.gemini/antigravity/scratch/robillionair/worker/wrangler.toml).

### 2. Upload OpenRouter Secret API Key
Upload your OpenRouter secret securely to Cloudflare:
```bash
npx wrangler secret put OPENROUTER_API_KEY
```

### 3. Deploy the Cloudflare Worker
Deploy the API logic:
```bash
cd worker
npx wrangler deploy
```

### 4. Deploy Cloudflare Pages (Frontend)
1. Initialize a Git repository in `robillionair/` and push to a private GitHub repo.
2. In the Cloudflare Dashboard, go to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3. Select your repository. Set the Build directory to `public` (no build command required since it is a static page).
4. Save and Deploy.
5. In **Custom Domains**, connect your domain `robillionair.com` to your Pages project.
