const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIG & STORAGE SETUP (設定與儲存)
// ==========================================

// Zeabur 或 Docker 環境通常建議掛載 Volume 到 /app/data
// 本機開發時會存到專案目錄下的 data 資料夾
const DATA_DIR = path.join(__dirname, 'data');

// 初始化：確保儲存資料夾存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[Init] Data directory created at: ${DATA_DIR}`);
}

// Middleware
app.use(cors());                 // 允許跨域 (讓前端可以隨意 Call)
app.use(bodyParser.json());      // 解析 JSON Payload

// ==========================================
// FRONTEND DOCS (前端 HTML 文件)
// ==========================================
const HTML_DOCS = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SQLegend | The Best SQL Database</title>
    <style>
        :root { --bg: #0f0f12; --card: #1b1b1f; --border: #2d2d33; --text: #e0e0e0; --accent: #00e599; --accent-hover: #00c482; --code-bg: #101010; --muted: #888; }
        body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; line-height: 1.6; }
        .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
        
        /* Header */
        header { text-align: center; margin-bottom: 50px; }
        h1 { font-size: 3rem; margin: 0; letter-spacing: -1px; }
        h1 span { color: var(--accent); }
        .subtitle { color: var(--muted); font-size: 1.2rem; margin-top: 10px; }

        /* Steps */
        .step { margin-bottom: 40px; border-left: 3px solid var(--border); padding-left: 20px; transition: 0.3s; }
        .step.active { border-left-color: var(--accent); }
        .step-title { font-size: 1.4rem; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 10px; }
        .step-badge { background: var(--border); color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; }
        .step.active .step-badge { background: var(--accent); color: #000; }

        /* Cards & Interactions */
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 25px; margin-top: 15px; }
        button { background: var(--accent); color: #000; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 1rem; transition: 0.2s; }
        button:hover { background: var(--accent-hover); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        
        /* Code Blocks */
        pre { background: var(--code-bg); padding: 15px; border-radius: 6px; overflow-x: auto; font-family: 'Consolas', monospace; border: 1px solid #333; color: #a5b3ce; }
        code { background: #333; padding: 2px 6px; border-radius: 4px; color: #fff; font-family: 'Consolas', monospace; }
        .copy-btn { float: right; font-size: 0.8rem; background: transparent; color: var(--muted); padding: 2px 8px; border: 1px solid var(--border); }

        /* Live Console */
        .console-area { display: flex; flex-direction: column; gap: 10px; }
        textarea { background: #000; color: #0f0; border: 1px solid var(--border); padding: 15px; border-radius: 6px; font-family: 'Consolas', monospace; min-height: 100px; resize: vertical; outline: none; }
        textarea:focus { border-color: var(--accent); }
        #console-output { min-height: 60px; white-space: pre-wrap; color: #fff; }

        /* Utils */
        .hidden { display: none; }
        .highlight { color: var(--accent); font-weight: bold; }
        a { color: var(--accent); text-decoration: none; }
    </style>
</head>
<body>

<div class="container">
    <header>
        <h1>SQL<span>egend</span></h1>
        <div class="subtitle">The Best Easy & Free SQL Server.</div>
    </header>

    <!-- STEP 0: Introduction -->
    <div class="card" style="margin-bottom: 40px; border-color: var(--accent);">
        <strong>👋 How this works:</strong>
        <p>You don't need to install anything. You don't need to configure ports. <br>
        You just get a <strong>Database ID</strong>, and you send <strong>SQL commands</strong> via HTTP POST requests. That's it.</p>
    </div>

    <!-- STEP 1: Get ID -->
    <div class="step active" id="step1">
        <div class="step-title"><span class="step-badge">STEP 1</span> Get Your Database Key</div>
        <p>Click the button to generate a unique, persistent database file on our server.</p>
        
        <div class="card">
            <button onclick="createDB()" id="createBtn">Create Database</button>
            <div id="credentials" class="hidden" style="margin-top: 20px;">
                <p>✅ <strong>Database Created!</strong> Save this ID immediately:</p>
                <pre id="myDbId" style="font-size: 1.5rem; color: var(--accent); border-color: var(--accent);">...</pre>
                <p style="font-size: 0.9rem; color: #ff5555;">⚠️ Warning: If you lose this ID, you lose your data. We cannot recover it.</p>
            </div>
        </div>
    </div>

    <!-- STEP 2: Live Test -->
    <div class="step" id="step2">
        <div class="step-title"><span class="step-badge">STEP 2</span> Try it (Live Console)</div>
        <p>You can test your database right here without writing code. Paste your ID above first!</p>
        
        <div class="card console-area">
            <input type="text" id="consoleId" placeholder="Paste your DB ID here..." style="background:#222; border:1px solid #444; color:#fff; padding:10px; border-radius:4px;">
            <textarea id="consoleSql" placeholder="Type SQL here... e.g., CREATE TABLE users (id INT, name TEXT);"></textarea>
            <button onclick="runConsole()" style="width: 100px;">Run SQL</button>
            <div style="margin-top:5px; font-size:0.9rem; color:var(--muted);">Result:</div>
            <pre id="consoleOutput">Waiting for command...</pre>
        </div>
        <p style="margin-top:10px;">
            <small>👉 Try: <code>CREATE TABLE users (name TEXT, weight INT);</code></small><br>
            <small>👉 Try: <code>INSERT INTO users VALUES ('John', 10);</code></small><br>
            <small>👉 Try: <code>SELECT * FROM users;</code></small>
        </p>
    </div>

    <!-- STEP 3: Integration -->
    <div class="step">
        <div class="step-title"><span class="step-badge">STEP 3</span> Use in Your Code</div>
        <p>Now, connect your application. Copy the snippets below.</p>

        <h3>📌 Endpoint Info</h3>
        <pre>POST ${process.env.URL || 'https://sqlegend.zeabur.app'}/api
Content-Type: application/json</pre>

        <h3>Javascript (Node/Frontend)</h3>
        <pre>
const DB_ID = "YOUR_ID_HERE";
const API_URL = "${process.env.URL || 'https://sqlegend.zeabur.app'}/api";

async function query(sql) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: DB_ID, sql: sql })
    });
    return await res.json();
}

// Example usage:
query("SELECT * FROM users").then(console.log);
        </pre>

        <h3>Python</h3>
        <pre>
import requests

DB_ID = "YOUR_ID_HERE"
URL = "${process.env.URL || 'https://sqlegend.zeabur.app'}/api"

def run_sql(sql):
    resp = requests.post(URL, json={"id": DB_ID, "sql": sql})
    return resp.json()

print(run_sql("SELECT 1 + 1 as result"))
        </pre>
    </div>

    <footer style="text-align: center; margin-top: 80px; opacity: 0.4;">
        Powered by <strong>SQLegend</strong> & better-sqlite3.
    </footer>
</div>

<script>
    // 建立新資料庫
    async function createDB() {
        const btn = document.getElementById('createBtn');
        btn.disabled = true;
        btn.innerText = 'Creating...';
        
        try {
            const req = await fetch('/new', { method: 'POST' });
            const res = await req.json();
            
            if (res.success) {
                document.getElementById('credentials').classList.remove('hidden');
                document.getElementById('myDbId').innerText = res.id;
                
                // 自動幫用戶填入 Console
                document.getElementById('consoleId').value = res.id;
                document.getElementById('step1').classList.remove('active');
                document.getElementById('step2').classList.add('active');
            }
        } catch(e) {
            alert('Error creating DB');
        }
        btn.innerText = 'Create Another Database';
        btn.disabled = false;
    }

    // 在 Console 執行 SQL
    async function runConsole() {
        const id = document.getElementById('consoleId').value.trim();
        const sql = document.getElementById('consoleSql').value.trim();
        const out = document.getElementById('consoleOutput');
        
        if(!id) { alert('Please enter a DB ID'); return; }
        if(!sql) { alert('Please enter SQL command'); return; }

        out.innerText = 'Running...';
        out.style.color = '#fff';

        try {
            const req = await fetch('/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, sql })
            });
            const res = await req.json();
            
            if(res.success) {
                out.innerText = JSON.stringify(res.data, null, 2);
                out.style.color = '#00e599'; // Green for success
            } else {
                out.innerText = "Error: " + res.error;
                out.style.color = '#ff5555'; // Red for error
            }
        } catch(e) {
            out.innerText = "Network Error";
        }
    }
</script>

</body>
</html>
`;

// ==========================================
// BACKEND ROUTES (後端路由)
// ==========================================

// 1. 首頁 (回傳上面的 HTML 教學)
app.get(['/', '/docs'], (req, res) => {
    res.send(HTML_DOCS);
});

// 2. 創建新 DB (產生 Hex ID)
app.post('/new', (req, res) => {
    // 產生 16位 hex 字串
    const id = crypto.randomBytes(8).toString('hex');
    // 注意：這裡我們不建立實體檔案，等到第一次 /api 請求寫入時才建立 (Lazy Init)
    
    console.log(`[CREATE] New DB ID generated: ${id}`);
    res.json({
        success: true,
        id: id,
        message: "Database authorized. Use this ID for all requests."
    });
});

// 3. 核心 API (執行 SQL)
app.post('/api', (req, res) => {
    const { id, sql } = req.body;

    // --- 基礎驗證 ---
    if (!id || !sql) {
        return res.status(400).json({ success: false, error: 'Missing "id" or "sql" fields.' });
    }

    // --- 安全性驗證 (重要) ---
    // 確保 ID 只包含 hex 字元，防止路徑遍歷攻擊 (e.g. "../../../etc/passwd")
    if (!/^[a-f0-9]+$/.test(id)) {
        return res.status(403).json({ success: false, error: 'Invalid ID format. Hex only.' });
    }

    const dbFile = path.join(DATA_DIR, `${id}.db`);
    let db = null;

    try {
        // --- 連線資料庫 ---
        // better-sqlite3 若檔案不存在會自動建立
        db = new Database(dbFile);

        // --- 執行 SQL ---
        const stmt = db.prepare(sql);
        let data;

        // 判斷 SQL 類型
        if (stmt.reader) {
            // 如果是 SELECT (讀取)
            data = stmt.all();
        } else {
            // 如果是 INSERT/UPDATE/DELETE/CREATE (寫入)
            data = stmt.run();
            // run() 回傳 { changes: 1, lastInsertRowid: 1 ... }
        }

        // --- 回傳成功 ---
        res.json({
            success: true,
            data: data
        });

    } catch (err) {
        // --- 錯誤處理 ---
        // 常見錯誤：Table 不存在, SQL 語法錯誤, Constraint 衝突
        console.error(`[SQL ERROR] ID:${id} | SQL:${sql} | ERR:${err.message}`);
        res.status(400).json({
            success: false,
            error: err.message
        });
    } finally {
        // --- 資源釋放 ---
        // 這是 Serverless/Stateless 的關鍵：每次請求結束必須關閉連線
        // 否則高併發時會出現 "Too many open files" 錯誤
        if (db) db.close();
    }
});

app.all("*", (req, res) => {
    res.redirect("https://sqlegend.nethacker.cloud");
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`🚀 SQLegend Server is running!`);
    console.log(`📂 Data Storage: ${DATA_DIR}`);
    console.log(`🔌 Port: ${PORT}`);
    console.log(`-------------------------------------------`);
});
