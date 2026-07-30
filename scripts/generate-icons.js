const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Helper to extract logo mark and set alpha channel
async function extractLogoMark(inputPath, foregroundColor = null) {
  const image = sharp(inputPath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  
  // Dominant background gold color in logomain.jpeg: (251, 179, 7)
  const bgR = 251;
  const bgG = 179;
  const bgB = 7;
  
  const outData = Buffer.alloc(data.length);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate Euclidean distance from dominant background gold
    const dist = Math.sqrt((bgR - r) ** 2 + (bgG - g) ** 2 + (bgB - b) ** 2);
    
    let alpha;
    if (dist < 30) {
      alpha = 0; // Pure background -> fully transparent
    } else if (dist > 100) {
      alpha = 255; // Core logo mark -> fully opaque
    } else {
      // Smooth alpha ramp for anti-aliasing
      alpha = Math.round(((dist - 30) / 70) * 255);
    }
    
    if (foregroundColor) {
      // Set to custom foreground color (e.g. brand gold or white)
      outData[i] = foregroundColor.r;
      outData[i + 1] = foregroundColor.g;
      outData[i + 2] = foregroundColor.b;
    } else {
      // Keep original (which is white)
      outData[i] = r;
      outData[i + 1] = g;
      outData[i + 2] = b;
    }
    outData[i + 3] = alpha;
  }
  
  return sharp(outData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  });
}

// Helper to generate centered icon with padding on transparent background
async function generateTransparentIcon(logoSharp, outputPath, size, paddingRatio = 0.15) {
  // Trim transparent boundary pixels so centering is absolute
  const trimmed = await logoSharp.clone().trim().png().toBuffer();
  
  const innerSize = Math.round(size * (1 - 2 * paddingRatio));
  
  const resized = await sharp(trimmed)
    .resize({
      width: innerSize,
      height: innerSize,
      fit: 'inside',
      kernel: 'lanczos3'
    })
    .toBuffer();
    
  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Composite centered on transparent background
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{ input: resized, gravity: 'center' }])
  .png()
  .toFile(outputPath);
}

// Helper to generate centered icon with padding on solid gold background
async function generateSolidIcon(logoSharp, outputPath, size, paddingRatio = 0.15) {
  const trimmed = await logoSharp.clone().trim().png().toBuffer();
  
  const innerSize = Math.round(size * (1 - 2 * paddingRatio));
  
  const resized = await sharp(trimmed)
    .resize({
      width: innerSize,
      height: innerSize,
      fit: 'inside',
      kernel: 'lanczos3'
    })
    .toBuffer();
    
  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Composite centered on solid gold (#F5C22B / R=245, G=194, B=43) background
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 245, g: 194, b: 43, alpha: 1 }
    }
  })
  .composite([{ input: resized, gravity: 'center' }])
  .png()
  .toFile(outputPath);
}

async function run() {
  const root = 'e:\\HivebyTailorBee\\HivebyTailorBee';
  
  // Use logomain.jpeg at the monorepo root as the source
  const sourcePath = path.join(root, 'logomain.jpeg');
  
  console.log("Loading source file:", sourcePath);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found at ${sourcePath}`);
  }
  
  // Create logo mark versions
  console.log("Extracting logo mark (Gold foreground / Transparent background)...");
  const logoGold = await extractLogoMark(sourcePath, { r: 245, g: 194, b: 43 }); // Brand Gold: #F5C22B
  
  console.log("Extracting logo mark (White foreground / Transparent background)...");
  const logoWhite = await extractLogoMark(sourcePath, { r: 255, g: 255, b: 255 }); // White
  
  // Targets configuration
  const customerPublic = path.join(root, 'apps/customer/public');
  const boutiquePublic = path.join(root, 'apps/boutique/public');
  const adminPublic = path.join(root, 'apps/admin/public');
  const mobileAssets = path.join(root, 'apps/mobile/assets');
  
  // 1. Generate Web logo.png files (transparent gold)
  console.log("\nGenerating web logo.png files...");
  await generateTransparentIcon(logoGold, path.join(customerPublic, 'logo.png'), 1024, 0.15);
  await generateTransparentIcon(logoGold, path.join(boutiquePublic, 'logo.png'), 1024, 0.15);
  await generateTransparentIcon(logoGold, path.join(adminPublic, 'logo.png'), 1024, 0.15);
  
  // 2. Generate Next.js app icons (transparent gold)
  console.log("\nGenerating Next.js app icon.png files...");
  await generateTransparentIcon(logoGold, path.join(root, 'apps/customer/src/app/icon.png'), 512, 0.15);
  await generateTransparentIcon(logoGold, path.join(root, 'apps/boutique/src/app/icon.png'), 512, 0.15);
  await generateTransparentIcon(logoGold, path.join(root, 'apps/admin/src/app/icon.png'), 512, 0.15);

  // 3. Generate PWA standard transparent icons (transparent gold)
  console.log("\nGenerating customer PWA transparent icons...");
  await generateTransparentIcon(logoGold, path.join(customerPublic, 'icon-192x192.png'), 192, 0.15);
  await generateTransparentIcon(logoGold, path.join(customerPublic, 'icon-512x512.png'), 512, 0.15);
  
  console.log("Generating boutique PWA transparent icons...");
  await generateTransparentIcon(logoGold, path.join(boutiquePublic, 'icon-192x192.png'), 192, 0.15);
  await generateTransparentIcon(logoGold, path.join(boutiquePublic, 'icon-512x512.png'), 512, 0.15);

  // 4. Generate PWA maskable and apple-touch-icons (solid gold background, white foreground)
  console.log("\nGenerating customer PWA solid background icons...");
  await generateSolidIcon(logoWhite, path.join(customerPublic, 'icon-maskable.png'), 512, 0.20);
  await generateSolidIcon(logoWhite, path.join(customerPublic, 'apple-touch-icon.png'), 180, 0.15);

  console.log("Generating boutique PWA solid background icons...");
  await generateSolidIcon(logoWhite, path.join(boutiquePublic, 'icon-maskable.png'), 512, 0.20);
  await generateSolidIcon(logoWhite, path.join(boutiquePublic, 'apple-touch-icon.png'), 180, 0.15);

  // 5. Generate Expo Mobile assets
  console.log("\nGenerating Expo mobile app assets...");
  // App icon: solid background, white foreground
  await generateSolidIcon(logoWhite, path.join(mobileAssets, 'icon.png'), 1024, 0.15);
  // Adaptive icon: transparent background, white foreground
  await generateTransparentIcon(logoWhite, path.join(mobileAssets, 'adaptive-icon.png'), 1024, 0.15);
  // Favicon: transparent background, gold foreground
  await generateTransparentIcon(logoGold, path.join(mobileAssets, 'favicon.png'), 48, 0.15);
  // Splash logo: transparent background, white foreground
  await generateTransparentIcon(logoWhite, path.join(mobileAssets, 'splash-logo.png'), 1024, 0.15);

  console.log("\nSuccess: All brand assets, PWA touch assets, and Mobile App icons generated successfully!");
}

run().catch(error => {
  console.error("Error generating brand assets:", error);
  process.exit(1);
});
