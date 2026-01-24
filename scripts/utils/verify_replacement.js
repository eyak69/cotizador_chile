const fs = require('fs');
const JSZip = require('jszip');

async function verifyReplacement() {
    const filePath = 'uploads/temp/Presupuesto_134.docx';

    if (!fs.existsSync(filePath)) {
        console.log("❌ Archivo no encontrado:", filePath);
        return;
    }

    const content = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(content);

    if (zip.file("word/document.xml")) {
        const xml = await zip.file("word/document.xml").async("string");

        console.log("---- VERIFICACIÓN REEMPLAZO ----");

        // Datos esperados del ID 134
        const expectedClient = "Pavimentos Pulidos";
        const expectedVehiculo = "TOYOTA"; // HI-LUX

        const hasClient = xml.includes(expectedClient);
        const hasVehiculo = xml.includes(expectedVehiculo);
        const hasPlaceholders = xml.includes("+++");

        console.log(`Cliente '${expectedClient}' encontrado: ${hasClient ? '✅' : '❌'}`);
        console.log(`Vehículo '${expectedVehiculo}' encontrado: ${hasVehiculo ? '✅' : '❌'}`);
        console.log(`Placeholders '+++' restantes: ${hasPlaceholders ? '❌ (Falla)' : '✅ (Limpio)'}`);

        if (hasPlaceholders) {
            console.log("\nContexto de placeholders restantes:");
            const idx = xml.indexOf("+++");
            console.log(xml.substring(idx - 20, idx + 50));
        }

    } else {
        console.log("❌ No se pudo leer document.xml del docx.");
    }
}

verifyReplacement().catch(console.error);
