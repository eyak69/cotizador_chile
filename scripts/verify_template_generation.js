const createReport = require('docx-templates').default;
const fs = require('fs');
const path = require('path');

async function verify() {
    console.log("Starting verification...");

    // Path to the generated template
    const templatePath = path.join(__dirname, '..', 'uploads', 'doc', 'plantilla_ejemplo.docx');

    if (!fs.existsSync(templatePath)) {
        console.error("Template not found at:", templatePath);
        process.exit(1);
    }

    console.log("Template found. Reading...");
    const template = fs.readFileSync(templatePath);

    const data = {
        cliente: "Cliente Test",
        fecha: "01/01/2026",
        vehiculo: "Vehículo Test",
        detalles: [
            {
                compania: "Test Co",
                plan: "Test Plan",
                prima_uf3: "1.0",
                prima_uf5: "2.0",
                prima_uf10: "3.0",
                taller: "SI",
                rc: "1000"
            }
        ]
    };

    try {
        console.log("Processing template...");
        const buffer = await createReport({
            template,
            data,
            cmdDelimiter: '+++'
        });
        console.log("Template processed successfully!");

        // Write output just to be sure
        const outputPath = path.join(__dirname, '..', 'test_output_verify.docx');
        fs.writeFileSync(outputPath, Buffer.from(buffer));
        console.log("Output written to:", outputPath);

    } catch (error) {
        console.error("VERIFICATION FAILED:");
        console.error(error);
        process.exit(1);
    }
}

verify();
