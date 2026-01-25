const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Helper para paths (asumiendo que estamos en backend/services)
const getRootDir = () => path.resolve(__dirname, '..', '..');

class DocumentService {

    /**
     * Genera un archivo Word (.docx) a partir de una plantilla y datos.
     * @param {Object} data - Datos para reemplazar en la plantilla.
     * @param {string} templateName - Nombre del archivo de plantilla en uploads/templates.
     * @param {string} outputName - Nombre del archivo de salida (sin path).
     * @returns {Promise<string>} - Ruta absoluta del archivo generado.
     */
    async generateWord(data, templateName, outputName) {
        const rootDir = getRootDir();
        const templatePath = path.join(rootDir, 'uploads', 'templates', templateName);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`La plantilla ${templateName} no existe en /uploads/templates.`);
        }

        console.log(`[DocumentService] Usando plantilla: ${templatePath}`);
        const content = fs.readFileSync(templatePath);

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        doc.render(data);

        const buffer = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE",
        });

        const tempDir = path.join(rootDir, 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const outputPath = path.join(tempDir, outputName);
        fs.writeFileSync(outputPath, buffer);
        console.log(`[DocumentService] Archivo generado: ${outputPath}`);

        return outputPath;
    }

    /**
     * Genera un archivo Excel (.xlsx) con el detalle de la cotización.
     * @param {Object} quote - Objeto de cotización completo (con detalles).
     * @param {string} outputName - Nombre del archivo de salida.
     * @returns {Promise<string>} - Ruta absoluta del archivo generado.
     */
    async generateExcel(quote, outputName) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Cotización');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Compañía', key: 'compania', width: 30 },
            { header: 'Plan', key: 'plan', width: 30 },
            { header: 'Deducible', key: 'deducible', width: 15 },
            { header: 'Prima 3UF', key: 'prima_uf3', width: 15 },
            { header: 'Prima 5UF', key: 'prima_uf5', width: 15 },
            { header: 'Prima 10UF', key: 'prima_uf10', width: 15 },
            { header: 'Taller Marca', key: 'taller', width: 15 },
            { header: 'Reposición', key: 'reposicion', width: 15 },
            { header: 'RC', key: 'rc', width: 20 },
            { header: 'Observación', key: 'obs', width: 50 }
        ];

        quote.detalles.forEach(d => {
            worksheet.addRow({
                id: d.id,
                compania: d.compania,
                plan: d.plan,
                deducible: d.deducible,
                prima_uf3: d.prima_uf3,
                prima_uf5: d.prima_uf5,
                prima_uf10: d.prima_uf10,
                taller: d.taller_marca,
                reposicion: d.reposicion_meses,
                rc: d.rc_monto,
                obs: d.observaciones
            });
        });

        // Estilos básicos
        worksheet.getRow(1).font = { bold: true };

        const rootDir = getRootDir();
        const tempDir = path.join(rootDir, 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const outputPath = path.join(tempDir, outputName);
        await workbook.xlsx.writeFile(outputPath);
        console.log(`[DocumentService] Excel generado: ${outputPath}`);

        return outputPath;
    }
}

module.exports = new DocumentService();
