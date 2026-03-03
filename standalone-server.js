/**
 * Standalone API server for Mapleins (bypasses Next.js compilation issues)
 * Implements /api/resume/analyze and /api/resume/generate routes directly.
 * Run with: node standalone-server.js
 */
"use strict";

const http = require("http");
const Busboy = require("busboy");
const { execFile } = require("child_process");
const { writeFile, unlink, mkdtemp, rmdir } = require("fs/promises");
const { promisify } = require("util");
const { join } = require("path");
const { tmpdir } = require("os");
const fs = require("fs");

// Load .env.local
try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = process.env[key] || val;
    }
  }
  console.log("[env] Loaded .env.local");
} catch {}

const execFileAsync = promisify(execFile);
const PORT = process.env.PORT || 3002;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// ===== PDF EXTRACTION =====
async function extractTextFromPDF(buffer) {
  let tmpDir = null, pdfPath = null;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), "mapleins-"));
    pdfPath = join(tmpDir, "resume.pdf");
    await writeFile(pdfPath, buffer);
    const { stdout } = await execFileAsync("pdftotext", ["-raw", pdfPath, "-"], {
      timeout: 15000, maxBuffer: 5 * 1024 * 1024,
    });
    const text = stdout?.trim() ?? "";
    if (text.length > 50) return text;
    const { stdout: stdout2 } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], {
      timeout: 15000, maxBuffer: 5 * 1024 * 1024,
    });
    return stdout2?.trim() ?? "";
  } catch (err) {
    console.error("[pdfExtract] pdftotext failed:", err.message);
    return "";
  } finally {
    if (pdfPath) try { await unlink(pdfPath); } catch {}
    if (tmpDir) try { await rmdir(tmpDir); } catch {}
  }
}

// ===== RESUME TEXT PARSING =====
function extractFromText(rawText) {
  const text = rawText || "";
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result = {};

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) result.email = emailMatch[0];

  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) result.phone = phoneMatch[0].trim();

  const nameLine = lines.find(line => {
    if (line.length > 50 || line.length < 3) return false;
    if (/[0-9@]/.test(line)) return false;
    const lower = line.toLowerCase();
    if (/^(resume|cv|curriculum vitae|page|contact|email|phone|mobile|location|address|linkedin|github|portfolio)\b/.test(lower)) return false;
    if (lower.includes(".com") || lower.includes("www.") || lower.includes("http")) return false;
    if (/^[A-Za-z\u00C0-\u00FF\s\-']+$/.test(line)) return true;
    return false;
  });
  if (nameLine) {
    if (nameLine === nameLine.toUpperCase() || nameLine === nameLine.toLowerCase()) {
      result.name = nameLine.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    } else {
      result.name = nameLine;
    }
  }

  const bulletLines = lines.filter(
    l => /^[•●\-\*]\s/.test(l) || /^\d+\.\s/.test(l) || (l.length > 25 && l.length < 200)
  );
  if (bulletLines.length > 0) result.experience = bulletLines.slice(0, 12);

  const summaryMatch = text.match(/(?:professional\s+)?summary\s*\n([\s\S]*?)(?=\n[A-Z][A-Z\s]+(?:\n|$)|core\s+competencies|experience|education)/i);
  if (summaryMatch) {
    const s = summaryMatch[1].replace(/\s+/g, " ").trim().slice(0, 500);
    if (s) result.summary = s;
  }

  const skillsMatch = text.match(/(?:skills?|core\s+competencies)[:\s]*\n([\s\S]*?)(?=\n[A-Z][a-z]*\s*[:\n]|$)/i);
  if (skillsMatch) {
    result.skills = skillsMatch[1]
      .split(/\n/).flatMap(line => line.split(/[,;|●•\-]/))
      .map(s => s.trim()).filter(s => s.length > 1 && s.length < 50).slice(0, 12);
  }

  const educationMatch = text.match(/(?:education|academic|qualifications)[:\s]*\n([\s\S]*?)(?=\n[A-Z][A-Z\s]{3,}(?:\n|$)|\n(?:experience|work|skills|summary|projects|certifications)|\s*$)/i);
  if (educationMatch) {
    result.education = educationMatch[1]
      .split(/\n/).map(l => l.replace(/^[•●\-\*]\s*/, "").trim())
      .filter(l => l.length > 5 && l.length < 200).slice(0, 8);
  }

  return result;
}

// ===== AI CALL =====
async function callAI(messages) {
  if (!GROQ_API_KEY || GROQ_API_KEY === "your_groq_api_key_here") {
    throw new Error("GROQ_API_KEY not configured");
  }
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content || "" };
}

// ===== PARSE MULTIPART =====
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const fields = {};
    let fileBuffer = null;
    bb.on("field", (name, val) => { fields[name] = val; });
    bb.on("file", (name, file) => {
      const chunks = [];
      file.on("data", chunk => chunks.push(chunk));
      file.on("end", () => { fileBuffer = Buffer.concat(chunks); });
    });
    bb.on("close", () => resolve({ fields, fileBuffer }));
    bb.on("error", reject);
    req.pipe(bb);
  });
}

// ===== ANALYZE ROUTE =====
const JOB_SECTORS = ["Warehouse", "Trucking", "Retail", "IT", "Healthcare"];

async function handleAnalyze(req, res) {
  let rawText = "";
  let fileBuffer = null;

  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    const { fields, fileBuffer: fb } = await parseMultipart(req);
    fileBuffer = fb;
  } else {
    const body = await new Promise((resolve) => {
      let data = "";
      req.on("data", chunk => { data += chunk; });
      req.on("end", () => resolve(JSON.parse(data)));
    });
    if (body.resumeUrl) {
      const pdfRes = await fetch(body.resumeUrl);
      fileBuffer = Buffer.from(await pdfRes.arrayBuffer());
    }
  }

  if (fileBuffer && fileBuffer.length > 0) {
    rawText = await extractTextFromPDF(fileBuffer);
  }

  const extracted = rawText ? extractFromText(rawText) : {};

  const systemPrompt = `You are a Canadian career advisor. Extract the resume EXACTLY as written.
RULES:
- Use the REAL name, email, phone, job titles, companies, dates, and every responsibility/achievement.
- Do NOT merge multiple bullets. Each responsibility must stay as its own bullet.
- suggestedSectors MUST be from: ${JOB_SECTORS.join(", ")}.
Return ONLY valid JSON:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "summary": "1-2 sentence professional summary",
  "experienceByRole": [{"role": "Job Title","company": "Company Name","dates": "Jan 2020 – Present","bullets": ["bullet 1", "bullet 2"]}],
  "experience": ["flat list of all bullets"],
  "education": ["Degree, Institution (Year)"],
  "skills": ["skill1", "skill2"],
  "suggestedSectors": ["Sector1"],
  "targetJobTitles": ["Job 1"],
  "whyTheseJobs": "1-2 sentences",
  "yearsOfExperience": 7
}`;

  const userPrompt = rawText?.trim()
    ? `Extract from this resume:\\n\\n${rawText.slice(0, 6000)}`
    : "No text extracted. Return generic analysis for a junior candidate.";

  let parsed = {
    name: extracted.name || "Your Name",
    email: extracted.email || "",
    phone: extracted.phone || "",
    summary: extracted.summary || "",
    experience: extracted.experience || [],
    experienceByRole: [],
    skills: extracted.skills || [],
    education: extracted.education || [],
    suggestedSectors: ["Retail"],
    targetJobTitles: [],
    whyTheseJobs: "",
    yearsOfExperience: 0,
  };

  try {
    const { content } = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);
    let jsonText = content.trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonText = jsonMatch[0];
    const aiParsed = JSON.parse(jsonText);
    const valid = (aiParsed.suggestedSectors || []).filter(s => JOB_SECTORS.includes(s));
    if (valid.length > 0) aiParsed.suggestedSectors = valid;
    // Merge: prefer AI but don't override with generic placeholders
    if (!aiParsed.name || aiParsed.name === "Your Name") aiParsed.name = extracted.name || "Your Name";
    if (!aiParsed.email || aiParsed.email.includes("example.com")) aiParsed.email = extracted.email || "";
    if (!aiParsed.phone || aiParsed.phone === "+1-555-0000") aiParsed.phone = extracted.phone || "";
    parsed = { ...parsed, ...aiParsed };
    // Flatten experience from experienceByRole if needed
    if (parsed.experienceByRole?.length && (!parsed.experience?.length || parsed.experience.length < 3)) {
      parsed.experience = parsed.experienceByRole.flatMap(e =>
        e.bullets?.length ? e.bullets : [`${e.role} at ${e.company}`]
      );
    }
  } catch (e) {
    console.warn("[analyze] AI failed, using heuristic only:", e.message);
  }

  return parsed;
}

// ===== HTTP SERVER =====
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Health check
  if (url.pathname === "/health" || url.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "mapleins-standalone" }));
    return;
  }

  // Analyze route
  if (url.pathname === "/api/resume/analyze" && req.method === "POST") {
    try {
      const result = await handleAnalyze(req, res);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error("[analyze] error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // For all other routes - serve static message
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`Mapleins API standalone server running on port ${PORT}.\nRoutes: POST /api/resume/analyze`);
});

server.listen(PORT, () => {
  console.log(`\n✅ Mapleins standalone API server running on http://localhost:${PORT}`);
  console.log(`   GROQ_API_KEY: ${GROQ_API_KEY ? "✅ configured" : "❌ missing"}`);
  console.log(`   Routes:`);
  console.log(`     GET  /health`);
  console.log(`     POST /api/resume/analyze (multipart PDF upload)`);
  console.log(`\n   Use this server for resume analysis while Next.js dev is being fixed.\n`);
});
