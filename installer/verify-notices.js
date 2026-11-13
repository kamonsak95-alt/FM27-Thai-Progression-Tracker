const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const runtimeDirectory = 'bin/notices/dotnet-runtime-win-x64-8.0.29';
const runtimeNotices = {
  'LICENSE.TXT': 'd7a68596ab69b06f51ca278a6545148e4269a9381c26d597c13df5d88e08cf5b',
  'THIRD-PARTY-NOTICES.TXT': 'b60b2912da28eaa6518593c9e2efb5334ee062d3c42e80d8fdfa806b3dc52977'
};

function verifyNotices(root, requireNode = false) {
  const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
  const [tracker, scanner] = license.split('### Third-Party Software Notices & Acknowledgements');
  if (!tracker.includes('Copyright (c) 2026 FM27 Thai Progression Tracker Contributors') ||
      !scanner?.includes('Copyright (c) 2026 mavarobli') ||
      ![tracker, scanner].every(notice => notice.includes('Permission is hereby granted') &&
        notice.includes('THE SOFTWARE IS PROVIDED "AS IS"'))) {
    throw new Error('LICENSE is missing the Tracker or FMSuperScout MIT notice');
  }
  for (const [name, expected] of Object.entries(runtimeNotices)) {
    const file = path.join(runtimeDirectory, name);
    const actual = createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    if (actual !== expected) throw new Error(`Unexpected SHA-256 for ${file}`);
  }
  if (requireNode) {
    const nodeLicense = path.join(root, 'bin', 'node-runtime', 'LICENSE');
    const digest = createHash('sha256').update(fs.readFileSync(nodeLicense)).digest('hex');
    if (digest !== 'ed34dd8e3f0a78dbaf00d0444ce8e285b015b765379c2e17880455f70370f8e9')
      throw new Error('Unexpected SHA-256 for the Node.js distribution LICENSE');
  }
}

if (require.main === module) verifyNotices(process.argv[2] || path.resolve(__dirname, '..'), process.argv.includes('--require-node'));

module.exports = { verifyNotices, runtimeDirectory, runtimeNotices };
