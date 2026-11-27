const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function createPlacesFontManifest(projectRoot) {
  const fonts = {};
  for (const [family, filename] of [
    ['BusanDandiMyeongjoM', 'BusanDandiMyeongjoM.otf'],
    ['Cafe24Simplehae', 'Cafe24Simplehae-v2.0.otf'],
  ]) {
    const hash = createHash('md5').update(fs.readFileSync(path.join(projectRoot, 'assets/fonts', filename))).digest('hex');
    const name = path.basename(filename, '.otf');
    fonts[family] = `/assets/assets/fonts/${name}.${hash}.otf`;
  }
  return fonts;
}

function writePlacesFontManifest(projectRoot) {
  const file = path.join(projectRoot, 'public/google-place-fonts.json');
  const content = JSON.stringify(createPlacesFontManifest(projectRoot), null, 2) + '\n';
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

module.exports = { createPlacesFontManifest, writePlacesFontManifest };
