const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Helper to remove white background from a JPG/PNG using alpha matting
async function removeWhiteBackground(inputPath) {
  const image = sharp(inputPath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Euclidean distance from pure white (255, 255, 255)
    const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
    
    if (dist < 20) {
      data[i + 3] = 0; // Pure white background -> fully transparent
    } else if (dist < 120) {
      // Smooth alpha ramp for anti-aliasing to eliminate the 1px white halo
      data[i + 3] = Math.round(((dist - 20) / 100) * 255);
    } else {
      data[i + 3] = 255; // Core logo colors -> fully opaque
    }
  }
  
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  });
}

// Helper to generate centered icon with padding
async function generateIcon(sourceSharp, outputPath, size, paddingRatio = 0.15) {
  // Trim transparent boundary pixels so centering is absolute
  const trimmed = await sourceSharp.clone().trim().png().toBuffer();
  
  const innerSize = Math.round(size * (1 - 2 * paddingRatio));
  
  const resized = await sharp(trimmed)
    .resize({
      width: innerSize,
      height: innerSize,
      fit: 'inside',
      kernel: 'lanczos3'
    })
    .toBuffer();
    
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

async function run() {
  const root = 'e:\\HivebyTailorBee\\HivebyTailorBee';
  
  // Source paths
  const customerSrc = path.join(root, 'hive logo 3 (1).png');
  const partnerSrc = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\13e08430-e16e-4d75-9d07-4774663517e1\\media__1783866910709.jpg';
  
  console.log("1. Processing user/customer logo...");
  const customerLogoSharp = sharp(customerSrc);
  
  const customerPublicDir = path.join(root, 'apps/customer/public');
  const adminPublicDir = path.join(root, 'apps/admin/public');
  
  // Overwrite base logo.png
  await customerLogoSharp.clone().png().toFile(path.join(customerPublicDir, 'logo.png'));
  await customerLogoSharp.clone().png().toFile(path.join(adminPublicDir, 'logo.png'));
  
  // Generate PWA icons for customer
  const customerIcons = [
    { name: 'icon-192x192.png', size: 192, pad: 0.15 },
    { name: 'icon-512x512.png', size: 512, pad: 0.15 },
    { name: 'icon-maskable.png', size: 512, pad: 0.20 },
    { name: 'apple-touch-icon.png', size: 180, pad: 0.15 }
  ];
  
  for (const icon of customerIcons) {
    console.log(`Generating customer PWA: ${icon.name}`);
    await generateIcon(customerLogoSharp, path.join(customerPublicDir, icon.name), icon.size, icon.pad);
  }
  
  // Update customer App icon
  console.log("Generating customer src/app/icon.png...");
  await generateIcon(customerLogoSharp, path.join(root, 'apps/customer/src/app/icon.png'), 512, 0.15);
  
  console.log("2. Processing partner/seller logo (with transparency background removal)...");
  const partnerLogoSharp = await removeWhiteBackground(partnerSrc);
  
  const boutiquePublicDir = path.join(root, 'apps/boutique/public');
  
  // Save as base logo.png
  await partnerLogoSharp.clone().png().toFile(path.join(boutiquePublicDir, 'logo.png'));
  
  // Generate PWA icons for boutique
  const boutiqueIcons = [
    { name: 'icon-192x192.png', size: 192, pad: 0.15 },
    { name: 'icon-512x512.png', size: 512, pad: 0.15 },
    { name: 'icon-maskable.png', size: 512, pad: 0.20 },
    { name: 'apple-touch-icon.png', size: 180, pad: 0.15 }
  ];
  
  for (const icon of boutiqueIcons) {
    console.log(`Generating boutique PWA: ${icon.name}`);
    await generateIcon(partnerLogoSharp, path.join(boutiquePublicDir, icon.name), icon.size, icon.pad);
  }
  
  // Update boutique App icon
  console.log("Generating boutique src/app/icon.png...");
  await generateIcon(partnerLogoSharp, path.join(root, 'apps/boutique/src/app/icon.png'), 512, 0.15);
  
  // Update admin App icon (uses customer logo)
  console.log("Generating admin src/app/icon.png...");
  await generateIcon(customerLogoSharp, path.join(root, 'apps/admin/src/app/icon.png'), 512, 0.15);
  
  console.log("\nSuccess: Brand logos, PWA touch assets, and App icons generated perfectly!");
}

run().catch(error => {
  console.error("Error generating icons:", error);
  process.exit(1);
});
