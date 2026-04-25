import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/favicon.svg');
const out192 = path.resolve('public/pwa-192x192.png');
const out512 = path.resolve('public/pwa-512x512.png');

async function generate() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(out192);
      
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(out512);
      
    console.log('Icons generated successfully.');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generate();
