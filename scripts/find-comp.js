const fs = require('fs');
const path = require('path');

const lokasi = JSON.parse(fs.readFileSync(path.join(__dirname, '../prisma/seed-data/lokasi.json'), 'utf8'));

const compRegions = {};
for (const e of lokasi.estates) {
  if (!compRegions[e.companyCode]) compRegions[e.companyCode] = { regions: new Set(), wilayah: new Set(), estates: [] };
  compRegions[e.companyCode].regions.add(e.regionCode);
  compRegions[e.companyCode].wilayah.add(e.wilayahName);
  compRegions[e.companyCode].estates.push(e);
}

for (const [code, info] of Object.entries(compRegions)) {
  if (info.regions.size > 1) {
    console.log('Multi-region company:', code, Array.from(info.regions));
  }
  if (info.wilayah.size > 1) {
    console.log('Multi-wilayah company:', code, Array.from(info.wilayah));
  }
}
