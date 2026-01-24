const fs = require('fs');
const path = require('path');

console.log("__dirname:", __dirname);
const templatePath = path.join(__dirname, 'uploads', 'doc', 'plantilla_ejemplo.docx');
console.log("Checking path:", templatePath);
console.log("Exists?", fs.existsSync(templatePath));

const fallbackPath = path.join(__dirname, 'uploads', 'templates', 'ejemplo_base.docx');
console.log("Fallback path:", fallbackPath);
console.log("Fallback Exists?", fs.existsSync(fallbackPath));

// List uploads/doc contents
const docDir = path.join(__dirname, 'uploads', 'doc');
if (fs.existsSync(docDir)) {
    console.log("Contents of uploads/doc:", fs.readdirSync(docDir));
} else {
    console.log("uploads/doc does not exist");
}
