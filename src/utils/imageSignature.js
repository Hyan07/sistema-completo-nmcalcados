'use strict';

const fs = require('fs/promises');

async function detectImageType(filePath) {
  const file = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await file.read(buffer, 0, 12, 0);
    const data = buffer.subarray(0, bytesRead);
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpeg';
    if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'png';
    if (data.length >= 12 && data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
    return null;
  } finally {
    await file.close();
  }
}

module.exports = { detectImageType };
