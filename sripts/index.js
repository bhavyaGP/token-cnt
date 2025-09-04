const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config(); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

function jestPromptTemplate(fileContent) {
  return `
You are an expert JavaScript testing assistant.  
Your job is to generate **complete and executable Jest unit tests** for the given code.

=== CODE START ===
${fileContent}
=== CODE END ===

TEST REQUIREMENTS:
- Use the Jest testing framework
- Cover ALL functions, methods, and exported modules in the file
- Organize tests using 'describe' and 'it/test' blocks
- Add meaningful test descriptions
- Include positive (expected behavior) and negative (error/invalid input) cases
- Test edge cases and boundary conditions
- Validate error handling (invalid params, wrong operations, etc.)
- Ensure generated code is executable Jest test code

IMPORTANT RESTRICTIONS:
- Do NOT include explanations, comments, or extra text
- Do NOT include markdown (no \`\`\` markers, no formatting)
- Output ONLY pure Jest test code
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

    const prompt = jestPromptTemplate(fileContent);

    console.log(`⚡ Generating tests for: ${file}`);

    try {
      const result = await model.generateContent(prompt);
      const tests = result.response.text();

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
