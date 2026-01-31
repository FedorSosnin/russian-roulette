const fs = require('fs');
const path = require('path');

// Assuming this script is run from the project root or we can resolve relative to this file
// If run from root via `node .agent/scripts/increment_version.js`
const indexPath = path.resolve(process.cwd(), 'index.html');

try {
    let content = fs.readFileSync(indexPath, 'utf8');
    const versionRegex = /class="version-tag">v(\d+)\.(\d+)\.(\d+)<\/div>/;
    const match = content.match(versionRegex);

    if (match) {
        let major = parseInt(match[1]);
        let minor = parseInt(match[2]);
        let patch = parseInt(match[3]);

        patch += 1;

        const newVersionTag = `class="version-tag">v${major}.${minor}.${patch}</div>`;
        content = content.replace(versionRegex, newVersionTag);
        fs.writeFileSync(indexPath, content);
        console.log(`Version incremented to v${major}.${minor}.${patch}`);
    } else {
        console.error('Version tag not found in index.html');
        process.exit(1);
    }
} catch (error) {
    console.error('Error updating version:', error);
    process.exit(1);
}
