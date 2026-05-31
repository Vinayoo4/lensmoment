const fs = require('fs');
const zlib = require('zlib');

function writeUInt32(buf, val, offset) {
  buf.writeUInt32BE(val, offset);
}

function crc32(buf) {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
  }

  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const buf = Buffer.alloc(data.length + 12);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  buf.writeUInt32BE(crc32(buf.subarray(4, buf.length - 4)), buf.length - 4);
  return buf;
}

function createSolidPng(width, height, hexColor, filename) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  const ihdr = makeChunk('IHDR', ihdrData);

  const rowData = Buffer.alloc(width * 3 + 1);
  rowData[0] = 0; // filter type
  for (let i = 0; i < width; i++) {
    rowData[i * 3 + 1] = r;
    rowData[i * 3 + 2] = g;
    rowData[i * 3 + 3] = b;
  }

  const rawPixels = Buffer.concat(Array(height).fill(rowData));
  const compressed = zlib.deflateSync(rawPixels);
  const idat = makeChunk('IDAT', compressed);

  const iend = makeChunk('IEND', Buffer.alloc(0));

  fs.writeFileSync(filename, Buffer.concat([signature, ihdr, idat, iend]));
}

createSolidPng(192, 192, '#4f46e5', 'frontend/public/icons/icon-192x192.png');
createSolidPng(512, 512, '#4f46e5', 'frontend/public/icons/icon-512x512.png');
