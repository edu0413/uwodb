// download-skills.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // install with: npm install node-fetch@2

// Load your JSON file
const skills = JSON.parse(fs.readFileSync("ship_skill_images.json", "utf-8"));

// Output folder
const outDir = path.join(process.cwd(), "images", "skills");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Helper: sanitize skill names into filenames
function toFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".png";
}

async function downloadImage(name, url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`❌ Failed ${name}: ${res.status}`);
    return;
  }
  const buffer = await res.buffer();
  const fileName = toFileName(name);
  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Saved ${name} -> ${fileName}`);
}

async function main() {
  for (const [name, url] of Object.entries(skills)) {
    try {
      await downloadImage(name, url);
    } catch (err) {
      console.error(`❌ Error downloading ${name}:`, err.message);
    }
  }
}

main();