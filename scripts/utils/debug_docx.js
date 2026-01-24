const docxTemplates = require('docx-templates');
console.log("Type of require('docx-templates'):", typeof docxTemplates);
console.log("Value:", docxTemplates);
if (docxTemplates.default) {
    console.log("Has default export:", typeof docxTemplates.default);
}
