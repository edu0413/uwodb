import axios from "axios";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";

// Your published sheet URL
const URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBOX-vHd-PjS3ofDHCXF-d4clPgMjKvNSJbONQp-k2wZALtPKKoO86muXhJVxijyoMtfQthBQaRlzL/pubhtml?gid=1726468186&;single=true&widget=false&chrome=false&headers=false&range=C2:J1500";

async function run() {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const skillMap = {};

    $("table tr").each((_, row) => {
      let skillName = null;
      let imageUrl = null;

      $(row)
        .find("td")
        .each((_, cell) => {
          const $cell = $(cell);
          const img = $cell.find("img").attr("src");
          const text = $cell.text().trim();

          if (img && !imageUrl) {
            imageUrl = img;
          }
          if (text && !skillName) {
            skillName = text;
          }
        });

      if (skillName && imageUrl) {
        skillMap[skillName] = imageUrl;
      }
    });

    // Save JSON file
    writeFileSync("skill_images.json", JSON.stringify(skillMap, null, 2), "utf-8");
    console.log(`✅ Extracted ${Object.keys(skillMap).length} skills → skill_images.json`);
  } catch (err) {
    console.error("Error extracting skill images:", err.message);
  }
}

run();