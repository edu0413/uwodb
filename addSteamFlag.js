const fs = require("fs");
const path = require("path");

// Load ships.json
const filePath = path.join(__dirname, "public/data/ships.json");
let ships = JSON.parse(fs.readFileSync(filePath, "utf8"));

// Default: add Steam = "No" if missing
ships = ships.map((ship) => ({
  ...ship,
  Steam: ship.Steam || "No",
}));

// List of known steam ships — update this as you confirm names
const steamShips = [
  "Steam Corvette",
  "Steam Warship",
  "Steam Battle Cruiser",
  "Steam Frigate",
  "Steam Transport",
  // add more here as needed...
];

// Flip Steam = "Yes" for matching ships
ships.forEach((ship) => {
  if (steamShips.includes(ship["Ship Name"])) {
    ship.Steam = "Yes";
  }
});

// Save back to JSON
fs.writeFileSync(filePath, JSON.stringify(ships, null, 2), "utf8");
console.log("✅ ships.json updated with Steam column!");