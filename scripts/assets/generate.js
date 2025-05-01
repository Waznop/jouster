const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

// Ensure assets directory exists
const assetsDir = path.join(__dirname, "../../public/assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Colors
const COLORS = {
  hearts: "#ff6b6b",
  diamonds: "#ff9f43",
  clubs: "#2d3436",
  spades: "#4834d4",
  cardBack: "#30336b",
  background: "#2c3e50",
};

function generateBackground() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext("2d");

  // Create gradient background
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 512);
  gradient.addColorStop(0, "#2c3e50");
  gradient.addColorStop(1, "#1e272e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Add pixel stars
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() < 0.3 ? 2 : 1;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`;
    ctx.fillRect(x, y, size, size);
  }

  // Save background
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(assetsDir, "background.png"), buffer);
}

function generateCardBack() {
  const canvas = createCanvas(140, 190);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = COLORS.cardBack;
  ctx.fillRect(0, 0, 140, 190);

  // Pixel art pattern
  ctx.fillStyle = "#4834d4";
  for (let y = 0; y < 190; y += 4) {
    for (let x = 0; x < 140; x += 4) {
      if ((x + y) % 8 === 0) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  // Border
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 138, 188);

  // Save card back
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(assetsDir, "card-back.png"), buffer);
}

function generateCards() {
  const canvas = createCanvas(140 * 13, 190 * 4); // 13 cards per suit, 4 suits
  const ctx = canvas.getContext("2d");

  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const values = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];

  // Generate each card
  suits.forEach((suit, suitIndex) => {
    values.forEach((value, valueIndex) => {
      const x = valueIndex * 140;
      const y = suitIndex * 190;

      // Card background
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, y, 140, 190);

      // Card border
      ctx.strokeStyle = COLORS[suit];
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, 138, 188);

      // Card value
      ctx.fillStyle = COLORS[suit];
      ctx.font = "32px Arial";
      ctx.textAlign = "center";
      const textWidth = ctx.measureText(value).width;
      ctx.fillText(value, x + 70, y + 110);

      // Small corner values
      ctx.font = "16px Arial";
      ctx.fillText(value, x + 20, y + 30);
      ctx.fillText(value, x + 120, y + 160);

      // Draw suit symbol
      drawSuitSymbol(ctx, suit, x + 70, y + 140, 20);
      drawSuitSymbol(ctx, suit, x + 20, y + 50, 10);
      drawSuitSymbol(ctx, suit, x + 120, y + 140, 10);
    });
  });

  // Save cards spritesheet
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(assetsDir, "cards.png"), buffer);
}

function drawSuitSymbol(ctx, suit, x, y, size) {
  ctx.fillStyle = COLORS[suit];

  switch (suit) {
    case "hearts":
      drawPixelHeart(ctx, x, y, size);
      break;
    case "diamonds":
      drawPixelDiamond(ctx, x, y, size);
      break;
    case "clubs":
      drawPixelClub(ctx, x, y, size);
      break;
    case "spades":
      drawPixelSpade(ctx, x, y, size);
      break;
  }
}

function drawPixelHeart(ctx, x, y, size) {
  const pixels = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];
  drawPixelShape(ctx, pixels, x, y, size / 5);
}

function drawPixelDiamond(ctx, x, y, size) {
  const pixels = [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];
  drawPixelShape(ctx, pixels, x, y, size / 5);
}

function drawPixelClub(ctx, x, y, size) {
  const pixels = [
    [0, 1, 0, 1, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];
  drawPixelShape(ctx, pixels, x, y, size / 5);
}

function drawPixelSpade(ctx, x, y, size) {
  const pixels = [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];
  drawPixelShape(ctx, pixels, x, y, size / 5);
}

function drawPixelShape(ctx, pixels, x, y, pixelSize) {
  const offsetX = x - (pixels[0].length * pixelSize) / 2;
  const offsetY = y - (pixels.length * pixelSize) / 2;

  pixels.forEach((row, rowIndex) => {
    row.forEach((pixel, colIndex) => {
      if (pixel) {
        ctx.fillRect(
          offsetX + colIndex * pixelSize,
          offsetY + rowIndex * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    });
  });
}

// Generate all assets
console.log("Generating background...");
generateBackground();
console.log("Generating card back...");
generateCardBack();
console.log("Generating cards...");
generateCards();
console.log("Assets generated successfully!");
