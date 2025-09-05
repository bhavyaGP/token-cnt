const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config(); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

function jestPromptTemplate(fileContent, requirePath, fileName) {
  return `
You are an expert software testing assistant.
Your job is to generate COMPLETE and EXECUTABLE unit/integration tests for the supplied module.

=== MODULE START ===
// Module filename: ${fileName}
${fileContent}
=== MODULE END ===

TEST REQUIREMENTS:
- Use a modern JavaScript testing framework (Jest preferred by default, but Mocha/Chai or Vitest are acceptable if Jest is not a fit).
- Structure tests clearly with describe/it (or test) blocks and meaningful descriptions.
- Cover all exported functions, classes, and the module's public behavior.
- Include positive (expected) cases, negative cases, and edge cases.
- Validate error handling and input validation thoroughly.
- Tests must be runnable with 'npm test' in a standard Node.js setup.

EXPRESS / HTTP SERVER RULES (IMPORTANT):
- If the module exports an Express/Koa/Fastify app instance, import it using the exact relative path provided below and use 'supertest' (or the most common HTTP-testing library for that framework).
- DO NOT call route handlers directly as functions. Instead, simulate HTTP requests (e.g., using supertest).
- Use async/await for request calls and assert on res.status / res.body (or res.statusCode).

IMPORTS & PATHS:
- Always import the module using the provided relative path: require('${requirePath}')
- Import additional testing tools as needed (e.g., supertest, sinon, chai).
- Mock external dependencies when appropriate.

OUTPUT FORMAT (MANDATORY):
- Output ONLY pure test code.
- No explanations, comments, or markdown — just the executable test file content.
`;
}


// ✅ Utility to check if a diff has real code changes (ignore comments/whitespace)
function hasCodeChange(diff) {
  const filtered = diff
    .split("\n")
    .filter(line => {
      if (!line.startsWith("+") && !line.startsWith("-")) return false;

      const code = line.slice(1).trim();

      // Ignore empty lines
      if (code === "") return false;

      // Ignore comments
      if (code.startsWith("//")) return false;
      if (code.startsWith("/*") || code.startsWith("*") || code.startsWith("*/")) return false;

      return true; // This is a meaningful change
    });

  return filtered.length > 0;
}

async function generateTests() {
  // Get changed JS files in the last commit
    // Get changed JS files in the last commit. Handle initial commit where HEAD~1 doesn't exist.
    let rawChanged = [];
    let commitCount = 0;
    try {
      commitCount = parseInt(execSync("git rev-list --count HEAD").toString().trim(), 10);
    } catch (err) {
      // If HEAD doesn't exist or other git error, treat as zero commits
      commitCount = 0;
    }

    try {
      if (commitCount <= 1) {
        // Initial or zero-commit repo: list files in HEAD (first commit) if present
        if (commitCount === 1) {
          rawChanged = execSync("git show --name-only --pretty=\"\" HEAD")
            .toString()
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean);
        } else {
          rawChanged = [];
        }
      } else {
        rawChanged = execSync("git diff --name-only HEAD~1 HEAD")
          .toString()
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean);
      }
    } catch (err) {
      console.error("Failed to determine changed files:", err && err.message ? err.message : err);
      return;
    }

    console.log("Changed files in the last commit:", rawChanged);

  const changedFiles = rawChanged
    .map((f) => f.replace(/\\/g, "/"))
    .filter(
      (f) => f.endsWith(".js") && (f.startsWith("server/") || f.includes("/server/"))
    );
  console.log("Relevant changed files:", changedFiles);
  if (changedFiles.length === 0) {
    console.log("⚠️ No relevant JS files changed in the last commit.");
    return;
  }

  // Gemini client
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  for (const file of changedFiles) {
    if (!fs.existsSync(file)) continue;

    // Get file diff
    let diff = "";
    try {
      if (commitCount <= 1) {
        // For initial commit assume file is new; skip diff-based filtering
        diff = null;
      } else {
        diff = execSync(`git diff HEAD~1 HEAD -- ${file}`).toString();
      }
    } catch (err) {
      console.warn(`Could not get diff for ${file}:`, err && err.message ? err.message : err);
      diff = null;
    }
    console.log("------------------");
    console.log(`\nProcessing file: ${file}`);
    if (diff !== null) console.log("Diff:", diff);
    console.log("------------------");
    // Check if diff contains real code changes
    if (diff !== null && !hasCodeChange(diff)) {
      console.log(`⏭️ Skipping ${file} (only comments/whitespace changed)`);
      continue;
    }

    const fileContent = fs.readFileSync(file, "utf8");
    if (!fileContent.trim()) continue;

  // compute a relative require path from tests to the module under test
  const absoluteFile = path.resolve(file);
  // tests will live under tests/... so compute relative path from test file to module
  const testFilePath = `tests/${file.replace('.js', '.test.js')}`;
  const requirePath = path.relative(path.dirname(testFilePath), absoluteFile).replace(/\\/g, '/');
  // ensure it starts with ./ or ../
  const normalizedRequirePath = requirePath.startsWith('.') ? requirePath : './' + requirePath;

  const prompt = jestPromptTemplate(fileContent, normalizedRequirePath, path.basename(file));

    console.log(`⚡ Generating tests for: ${file}`);

    try {
      // Commented out Gemini client call
      // const result = await model.generateContent(prompt);
      // const tests = result.response.text();

      // Use Ollama local API (gemma:2b)
      // Try to use global fetch, fall back to node-fetch if needed
      let fetchFn = global.fetch;
      if (!fetchFn) {
      try {
        fetchFn = (await import("node-fetch")).default;
      } catch (e) {
        throw new Error("No fetch available and node-fetch could not be imported");
      }
      }

      // Call Ollama local server. Adjust host/port if your ollama instance differs.
      const ollamaUrl = "http://127.0.0.1:11434/api/generate";
      const resp = await fetchFn(ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gemma:2b", prompt }),
      });

      if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Ollama API error ${resp.status}: ${body}`);
      }

      // Helper to extract text pieces from common response shapes
      function extractTextFromJson(obj) {
        if (!obj) return "";
        if (typeof obj === "string") return obj;
        if (obj.response && typeof obj.response === "string") return obj.response;
        if (obj.text && typeof obj.text === "string") return obj.text;
        if (obj.output) {
          if (Array.isArray(obj.output)) return obj.output.map((o) => (o?.content ?? "")).join("\n");
          if (typeof obj.output === "string") return obj.output;
        }
        if (obj.choices && Array.isArray(obj.choices)) {
          return obj.choices.map((c) => c?.message?.content || c?.text || "").join("\n");
        }
        // fallback: stringify
        try { return JSON.stringify(obj); } catch (e) { return ""; }
      }

      // Read streaming response if available (Ollama streams incremental JSON/NDJSON/event-stream)
      let tests = "";
      try {
        if (resp.body && typeof resp.body.getReader === "function") {
          // Web ReadableStream (Node 18+ global fetch)
          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            // lines or data: prefixed event-stream
            const parts = buf.split(/\r?\n/);
            buf = parts.pop();
            for (const part of parts) {
              const line = part.trim();
              if (!line) continue;
              const payload = line.startsWith("data:") ? line.replace(/^data:\s*/, "") : line;
              if (payload === "[DONE]") continue;
              try {
                const j = JSON.parse(payload);
                tests += extractTextFromJson(j);
              } catch (e) {
                // not JSON: append raw
                tests += payload;
              }
            }
          }
          // remaining buffer
          if (buf) {
            const leftover = buf.trim();
            if (leftover && leftover !== "[DONE]") {
              try {
                const j = JSON.parse(leftover);
                tests += extractTextFromJson(j);
              } catch (e) {
                tests += leftover;
              }
            }
          }
        } else if (resp.body && typeof resp.body.on === "function") {
          // Node stream (node-fetch or older APIs)
          await new Promise((resolve, reject) => {
            let buf = "";
            resp.body.on("data", (chunk) => {
              buf += chunk.toString();
              const parts = buf.split(/\r?\n/);
              buf = parts.pop();
              for (const part of parts) {
                const line = part.trim();
                if (!line) continue;
                const payload = line.startsWith("data:") ? line.replace(/^data:\s*/, "") : line;
                if (payload === "[DONE]") continue;
                try {
                  const j = JSON.parse(payload);
                  tests += extractTextFromJson(j);
                } catch (e) {
                  tests += payload;
                }
              }
            });
            resp.body.on("end", () => {
              if (buf) {
                const leftover = buf.trim();
                if (leftover && leftover !== "[DONE]") {
                  try {
                    const j = JSON.parse(leftover);
                    tests += extractTextFromJson(j);
                  } catch (e) {
                    tests += leftover;
                  }
                }
              }
              resolve();
            });
            resp.body.on("error", reject);
          });
        } else {
          // Fallback: read full body as text (non-streaming)
          const raw = await resp.text();
          // Try JSON first
          try {
            const json = JSON.parse(raw);
            tests = extractTextFromJson(json);
          } catch (e) {
            tests = raw;
          }
        }
      } catch (e) {
        // If streaming read fails, fall back to simple text read
        try {
          const raw = await resp.text();
          try {
            const json = JSON.parse(raw);
            tests = extractTextFromJson(json);
          } catch (e2) {
            tests = raw;
          }
        } catch (e2) {
          tests = "";
        }
      }

      const testFileName = `tests/${file.replace(".js", ".test.js")}`;
      const testDir = path.dirname(testFileName);

      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

      fs.writeFileSync(testFileName, tests);
      console.log("-------------------------------");
      console.log(`✅ Tests generated: ${testFileName}`);
    } catch (err) {
      console.error(
        `⚠️ Failed to generate/write tests for ${file}:`,
        err && err.message ? err.message : err
      );
      continue;
    }
  }
}

generateTests();

// try {
//       const result = await model.generateContent(prompt);
//       const tests = result.response.text();

//       const testFileName = `tests/${file.replace(".js", ".test.js")}`;
//       const testDir = path.dirname(testFileName);

//       if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

//       fs.writeFileSync(testFileName, tests);
//       console.log("-------------------------------");
//       console.log(`✅ Tests generated: ${testFileName}`);
//     } catch (err) {
//       console.error(
//         `⚠️ Failed to generate/write tests for ${file}:`,
//         err && err.message ? err.message : err
//       );
//       continue;
//     }