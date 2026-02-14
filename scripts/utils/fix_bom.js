const fs = require('fs');

const fixBom = (file) => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        if (content.charCodeAt(0) === 0xFEFF) {
            console.log(`Fixing BOM in ${file}`);
            content = content.slice(1);
            fs.writeFileSync(file, content);
            return true;
        }
    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
    return false;
};

fixBom('frontend/package.json');
fixBom('package.json');
