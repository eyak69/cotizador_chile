const { Cotizacion, DetalleCotizacion } = require('./models/mysql_models');
const { connectDB } = require('./database');
const path = require('path');
const fs = require('fs');
const createReport = require('docx-templates').default;

async function testGenerate134() {
    await connectDB();
    console.log("DB Conectada. Buscando Cotización 134...");

    const id = 134;
    const quote = await Cotizacion.findByPk(id, {
        include: [{ model: DetalleCotizacion, as: 'detalles' }]
    });

    if (!quote) {
        console.error("❌ Cotización 134 NO encontrada.");
        return;
    }

    const rootDir = __dirname;
    const templatePath = path.join(rootDir, 'uploads', 'templates', 'plantilla_presupuesto.docx');
    console.log(`[Word] Buscando plantilla en: ${templatePath}`);

    if (!fs.existsSync(templatePath)) {
        console.error("❌ La plantilla no existe.");
        return;
    }

    const templateBuffer = fs.readFileSync(templatePath);

    const data = {
        cliente: quote.asegurado || '',
        fecha: new Date(quote.createdAt).toLocaleDateString(),
        vehiculo: quote.vehiculo || '',
        vehículo: quote.vehiculo || '',
        fechaEmision: new Date(quote.createdAt).toLocaleDateString(),
        detalles: quote.detalles.map(d => ({
            compania: d.compania,
            plan: d.plan,
            prima_uf3: d.prima_uf3 || '-',
            prima_uf5: d.prima_uf5 || '-',
            prima_uf10: d.prima_uf10 || '-',
            taller: d.taller_marca || '-',
            rc: d.rc_monto || '-'
        }))
    };

    console.log("Generando reporte...");
    try {
        const buffer = await createReport({
            template: templateBuffer,
            data: data,
            cmdDelimiter: '&',
            failFast: false,
            processLineBreaks: true
        });

        const tempFileName = `Presupuesto_${id}.docx`;
        const tempFilePath = path.join(rootDir, 'uploads', 'temp', tempFileName);

        const tempDir = path.dirname(tempFilePath);
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        fs.writeFileSync(tempFilePath, Buffer.from(buffer));
        console.log(`✅ [Word] Archivo generado en temp: ${tempFilePath}`);
    } catch (e) {
        console.error("Error generating report:", e);
    }
}

testGenerate134().catch(console.error);
