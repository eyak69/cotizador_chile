const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'uploads', 'templates', 'plantilla_presupuesto_fixed.docx');
const dest = path.join(__dirname, 'uploads', 'templates', 'plantilla_presupuesto.docx');

try {
    if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
        console.log("Plantilla antigua eliminada.");
    }
    fs.copyFileSync(src, dest);
    console.log("Plantilla actualizada correctamente copiada desde fixed.");
} catch (e) {
    console.error("Error copiando plantilla:", e);
}
