'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { detectImageType } = require('../src/utils/imageSignature');

async function detect(bytes) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nm-img-'));
  const file = path.join(dir, 'sample.bin');
  try { await fs.writeFile(file, Buffer.from(bytes)); return await detectImageType(file); }
  finally { await fs.rm(dir, { recursive: true, force: true }); }
}

test('detecta assinatura JPEG', async () => { assert.equal(await detect([0xff,0xd8,0xff,0xe0,0,0,0,0,0,0,0,0]), 'jpeg'); });
test('detecta assinatura PNG', async () => { assert.equal(await detect([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]), 'png'); });
test('detecta assinatura WebP', async () => { assert.equal(await detect(Buffer.from('RIFF0000WEBP')), 'webp'); });
test('rejeita conteúdo desconhecido', async () => { assert.equal(await detect(Buffer.from('not-an-image')), null); });
