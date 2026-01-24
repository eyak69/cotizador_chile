const createReport = require('docx-templates').default;
const path = require('path');
const fs = require('fs');

async function testGeneration() {
    try {
        console.log("Iniciando prueba de generación de Word...");

        const templatePath = path.join(__dirname, 'uploads', 'templates', 'plantilla_presupuesto_fixed.docx');
        console.log("Buscando plantilla en:", templatePath);

        if (!fs.existsSync(templatePath)) {
            console.error("ERROR: No existe la plantilla en", templatePath);
            return;
        }

        const templateBuffer = fs.readFileSync(templatePath);
        console.log("Plantilla leída, tamaño:", templateBuffer.length);

        const data = {
            cliente: 'Cliente Prueba',
            fecha: '23/01/2026',
            vehiculo: 'Vehículo Prueba',
            detalles: [
                {
                    compania: 'Compañía A',
                    plan: 'Plan A',
                    prima_uf3: '10.5',
                    prima_uf5: '11.0',
                    prima_uf10: '12.0',
                    taller: 'Marca',
                    rc: 'UF 1000'
                }
            ]
        };

        console.log("Datos:", data);

        const buffer = await createReport({
            template: templateBuffer,
            data: data,
            cmdDelimiter: '+++'
        });

        console.log("Generación exitosa! Tamaño salida:", buffer.length);
        fs.writeFileSync('test_output.docx', Buffer.from(buffer));
        console.log("Archivo guardado en test_output.docx");

    } catch (e) {
        console.error("ERROR GENERANDO REPORTE:", e);
    }
}

testGeneration();
