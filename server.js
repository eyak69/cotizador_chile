const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const ExcelJS = require('exceljs');
const { interpretQuoteData: interpretQuoteGemini } = require('./ai_interpreter');
const { interpretQuoteData: interpretQuoteOpenAI } = require('./ai_interpreter_openai');

// CONFIGURACIÓN: Elige qué IA usar ('GEMINI' o 'OPENAI')
const AI_PROVIDER = 'GEMINI';

const interpretQuoteData = AI_PROVIDER === 'OPENAI' ? interpretQuoteOpenAI : interpretQuoteGemini;

const app = express();
const port = 3000;

// Middleware para parsear JSON y URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de Multer para archivos temporales y finales
const upload = multer({ dest: path.join(__dirname, 'uploads', 'temp') });

// Conexión a Base de Datos
// Conexión a Base de Datos (MySQL)
const { connectDB, sequelize } = require('./database');
const { Cotizacion, DetalleCotizacion, Empresa, Parametro, CorrectionRule } = require('./models/mysql_models');
const { Op } = require('sequelize'); // Importar Op para consultas de fechas
connectDB(); // Inicializar conexión y sincronización de modelos

// Asegurar directorios
const finalUploadDir = path.join(__dirname, 'uploads', 'final');
const tempUploadDir = path.join(__dirname, 'uploads', 'temp');

if (!fs.existsSync(finalUploadDir)) {
    fs.mkdirSync(finalUploadDir, { recursive: true });
}
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Middleware para servir archivos estáticos
// Middleware para servir archivos estáticos legacy (Deshabilitado para evitar conflictos con React)
// // Servir archivos subidos (opcional, si quieres ver el PDF desde la web)
app.use('/uploads', express.static('uploads'));
// app.use(express.static('public')); // Deshabilitado: Usar frontend React en dist/

// --- SERVIR FRONTEND (Producción) ---
const frontendDist = path.join(__dirname, 'frontend', 'dist');

console.log(`[DIAGNOSTIC] Checking paths:`);
console.log(`- Uploads (Final): ${finalUploadDir} (Exists: ${fs.existsSync(finalUploadDir)})`);
console.log(`- Uploads (Temp):  ${tempUploadDir} (Exists: ${fs.existsSync(tempUploadDir)})`);
console.log(`- Frontend Dist:   ${frontendDist} (Exists: ${fs.existsSync(frontendDist)})`);

if (fs.existsSync(frontendDist)) {
    console.log("[DIAGNOSTIC] Frontend build found. Serving static files...");
    const indexHtml = path.join(frontendDist, 'index.html');
    console.log(`- Index HTML:      ${indexHtml} (Exists: ${fs.existsSync(indexHtml)})`);

    app.use(express.static(frontendDist));

    // Cualquier ruta que no sea API, devuelve el index.html (React Router)
    app.get(/.*/, (req, res, next) => {
        if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(indexHtml);
    });
} else {
    console.error("⚠️ [CRITICAL] Frontend build NOT found in:", frontendDist);
    console.error("⚠️ The application UI will NOT load.");
}

app.post('/api/upload', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo PDF.' });
        }

        console.log(`Procesando archivo subido: ${req.file.originalname}`);

        let pathForAI = req.file.path;
        let tempOptimizedPath = null;

        // --- LOGICA DE EMPRESA Y PAGINADO ---
        let pagesToKeep = 2;
        let selectedEmpresa = null;
        let companyIdManual = req.body.companyId;

        try {
            if (companyIdManual) {
                selectedEmpresa = await Empresa.findByPk(companyIdManual);
                if (selectedEmpresa) {
                    if (selectedEmpresa.paginas_procesamiento != null) pagesToKeep = selectedEmpresa.paginas_procesamiento;
                    console.log(`🏢 Empresa seleccionada manualmente: ${selectedEmpresa.nombre} -> Límite páginas: ${pagesToKeep}`);
                }
            } else {
                // Fallback auto-detect (aunque el front debería obligar)
                const empresas = await Empresa.findAll();
                const fileNameUpper = req.file.originalname.toUpperCase();
                for (const emp of empresas) {
                    if (fileNameUpper.includes(emp.nombre.toUpperCase())) {
                        selectedEmpresa = emp;
                        if (emp.paginas_procesamiento != null) pagesToKeep = emp.paginas_procesamiento;
                        console.log(`🏢 Empresa detectada por nombre: ${emp.nombre} -> Límite páginas: ${pagesToKeep}`);
                        break;
                    }
                }
            }
        } catch (e) { console.error("Error identificando empresa:", e); }

        // --- OPTIMIZACIÓN PDF (Dinámica) ---
        const existingPdfBytes = fs.readFileSync(req.file.path);
        // Fix: Ignorar encriptación para PDFs protegidos pero legibles
        const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();

        if (pagesToKeep > 0 && pageCount > pagesToKeep) {
            console.log(`📄 PDF Largo detectado (${pageCount} págs). Optimizando a ${pagesToKeep} páginas para IA...`);
            const newPdf = await PDFDocument.create();

            const pageIndices = [];
            for (let i = 0; i < pagesToKeep; i++) {
                if (i < pageCount) pageIndices.push(i);
            }

            const pages = await newPdf.copyPages(pdfDoc, pageIndices);
            pages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            tempOptimizedPath = path.join(path.dirname(req.file.path), `opt_${req.file.filename}`);
            fs.writeFileSync(tempOptimizedPath, pdfBytes);
            pathForAI = tempOptimizedPath;
        }
        // ----------------------------------------------

        // 1. Interpretar con IA - LÓGICA DINÁMICA
        let activeModelId = 'gemini-1.5-flash';
        let activeProviderKey = 'google';
        let useModel = 'gemini-1.5-flash';
        let apiKey = "";

        try {
            const paramConfig = await Parametro.findByPk('IA_CONFIG');
            if (paramConfig && paramConfig.valor) {
                const fullConfig = JSON.parse(paramConfig.valor);
                const iaConf = fullConfig.configuracion_ia;

                if (iaConf) {
                    activeModelId = iaConf.modelo_por_defecto;

                    // Buscar el proveedor y configuración exacta del modelo
                    for (const [provKey, provData] of Object.entries(iaConf.proveedores)) {
                        const foundModel = provData.modelos.find(m => m.modelo === activeModelId);
                        if (foundModel) {
                            activeProviderKey = provKey; // 'google' | 'openai'
                            useModel = foundModel.modelo;
                            break;
                        }
                    }
                }
            }

            // Mapear 'google' -> 'GEMINI_API_KEY', 'openai' -> 'OPENAI_API_KEY'
            const keyMap = { 'google': 'GEMINI_API_KEY', 'openai': 'OPENAI_API_KEY' };
            const envVarName = keyMap[activeProviderKey];

            const paramKey = await Parametro.findByPk(envVarName);
            if (paramKey) apiKey = paramKey.valor;

        } catch (dbError) {
            console.error("Error leyendo configuración IA_CONFIG, usando defaults:", dbError);
        }

        // Leer parámetro DEBUG global
        let debugMode = true; // Default
        try {
            const pDebug = await Parametro.findByPk('DEBUG');
            if (pDebug && pDebug.valor === 'false') debugMode = false;
        } catch (e) { }

        console.log(`Usando Proveedor: ${activeProviderKey.toUpperCase()} | Modelo: ${useModel} | Debug: ${debugMode}`);

        // Config Object for Interpreter
        const aiConfig = { nombre: activeProviderKey === 'openai' ? 'OPENAI' : 'GEMINI', modelo: useModel };

        console.log(`Procesando con ${aiConfig.nombre} (Modelo: ${aiConfig.modelo})...`);

        // Seleccionar Intérprete
        const interpreterFunction = aiConfig.nombre === 'OPENAI' ? interpretQuoteOpenAI : interpretQuoteGemini;

        // Pasar configuración (apiKey, modelName) + pathForAI + originalName + reglas específicas
        const interpreterConfig = {
            apiKey,
            modelName: aiConfig.modelo,
            specificPromptRules: selectedEmpresa ? selectedEmpresa.prompt_reglas : null,
            debugMode: debugMode
        };
        console.log("DEBUG: Calling interpreter with config:", JSON.stringify({ ...interpreterConfig, apiKey: 'HIDDEN' }));
        const quoteData = await interpreterFunction(pathForAI, req.file.originalname, interpreterConfig);

        // 3. Mover archivo a ubicación final (simulando disco persistente)
        // Usar loteId del body si existe, sino timestamp
        const prefix = req.body.loteId || Date.now();
        const finalFileName = `${prefix}-${req.file.originalname}`;
        const finalPath = path.join(finalUploadDir, finalFileName);

        // Mover el archivo ORIGINAL (req.file.path), no el optimizado (pathForAI)
        fs.copyFileSync(req.file.path, finalPath);
        fs.unlinkSync(req.file.path); // Borrar temporal original

        // Borrar optimizado si existe
        if (tempOptimizedPath && fs.existsSync(tempOptimizedPath)) {
            // fs.unlinkSync(tempOptimizedPath); // MANTENER EN TEMP PARA DEBUG (Pedido usuario)
            console.log(`ℹ️ PDF optimizado guardado en: ${tempOptimizedPath}`);
        }

        // 4. Guardar en MySQL SOLO si no hubo error crítico en la lectura
        if (quoteData.asegurado === "Error de Lectura" || (quoteData.vehiculo && quoteData.vehiculo.startsWith("ERROR:"))) {
            console.log("Se detectó error en la IA, saltando guardado en DB y devolviendo error al cliente.");
            return res.json(quoteData);
        }

        // BUSCAR COTIZACIÓN EXISTENTE POR "LOTE" (Generado en Frontend)
        const loteId = req.body.loteId;

        // Si viene loteId, intentamos agrupar. Si no (ej: subida antigua), creamos siempre.
        let nuevaCotizacion;

        if (loteId) {
            nuevaCotizacion = await Cotizacion.findOne({
                where: { loteId: loteId }
            });
        }

        if (nuevaCotizacion) {
            console.log(`Encontrada cotización (Lote: ${loteId}, ID: ${nuevaCotizacion.id}). Agregando detalles...`);
            // Si el nombre del asegurado estaba vacío en la cabecera y ahora lo tenemos, lo actualizamos
            if (!nuevaCotizacion.asegurado && quoteData.asegurado) {
                await nuevaCotizacion.update({ asegurado: quoteData.asegurado, vehiculo: quoteData.vehiculo });
            }
        } else {
            console.log(`Creando nueva cotización (Lote: ${loteId})...`);
            nuevaCotizacion = await Cotizacion.create({
                asegurado: quoteData.asegurado,
                vehiculo: quoteData.vehiculo,
                loteId: loteId
                // rutaArchivo: ahora va en el detalle.
            });
        }

        if (quoteData.comparativa_seguros && quoteData.comparativa_seguros.length > 0) {
            const detalles = quoteData.comparativa_seguros.map(c => ({
                compania: c.compania,
                plan: c.plan,
                // Convertimmos a String explícitamente para evitar problemas con Sequelize si vienen números
                prima_uf3: c.primas?.uf_3 ? String(c.primas.uf_3) : null,
                prima_uf5: c.primas?.uf_5 ? String(c.primas.uf_5) : null,
                prima_uf10: c.primas?.uf_10 ? String(c.primas.uf_10) : null,
                rc_monto: c.caracteristicas?.rc ? String(c.caracteristicas.rc) : null,
                rc_tipo: null,
                taller_marca: c.caracteristicas?.taller_marca,
                reposicion_meses: c.caracteristicas?.reposicion_nuevo_meses ? String(c.caracteristicas.reposicion_nuevo_meses) : null,
                observaciones: c.caracteristicas?.otros_beneficios,
                CotizacionId: nuevaCotizacion.id,
                empresa_id: selectedEmpresa ? selectedEmpresa.id : null,
                rutaArchivo: `/uploads/final/${finalFileName}`
            }));

            console.log("DEBUG - Detalles MAPEADOS para insertar:", JSON.stringify(detalles, null, 2));

            // Filtrar duplicados antes de insertar: Verificar si ya existe este archivo en esta cotización
            const detallesAInsertar = [];
            for (const detalle of detalles) {
                const existe = await DetalleCotizacion.findOne({
                    where: {
                        CotizacionId: detalle.CotizacionId,
                        rutaArchivo: detalle.rutaArchivo
                    }
                });
                if (!existe) {
                    detallesAInsertar.push(detalle);
                } else {
                    console.warn(`Saltando detalle duplicado para archivo: ${detalle.rutaArchivo} en Cotización ID: ${detalle.CotizacionId}`);
                }
            }

            if (detallesAInsertar.length > 0) {
                await DetalleCotizacion.bulkCreate(detallesAInsertar);
            } else {
                console.log("No hay nuevos detalles para insertar (todos eran duplicados).");
            }
        }

        console.log('Cotización guardada en MySQL ID:', nuevaCotizacion.id);

        // RECUPERAR EL OBJETO COMPLETO DE LA BD PARA DEVOLVERLO AL FRONTEND
        // Esto asegura que el frontend reciba la estructura EXACTA que espera la tabla Maestro-Detalle
        const cotizacionCompleta = await Cotizacion.findByPk(nuevaCotizacion.id, {
            include: [{ model: DetalleCotizacion, as: 'detalles' }]
        });

        // Combinamos la respuesta de la DB con la respuesta RAW de la IA para debugging
        const responsePayload = {
            ...cotizacionCompleta.toJSON(),
            raw_ai_response: quoteData // <--- AQUÍ INYECTAMOS LA RESPUESTA ORIGINAL DE GEMINI
        };

        res.json(responsePayload);

    } catch (error) {
        console.error('Error en el servidor:', error);

        // Log error to file forensic
        const errorMsg = `[${new Date().toISOString()}] SERVER CRASH ERROR: ${error.message}\nStack: ${error.stack}\n\n`;
        fs.appendFileSync('error_log.txt', errorMsg);

        res.status(500).json({ error: 'Ocurrió un error al procesar la cotización.', details: error.message });
    }
});


// --- ABM EMPRESAS ---

app.get('/api/empresas', async (req, res) => {
    try {
        const empresas = await Empresa.findAll();
        res.json(empresas);
    } catch (error) {
        console.error("Error fetching empresas:", error);
        res.status(500).json({ error: "Error al obtener empresas." });
    }
});

app.post('/api/empresas', async (req, res) => {
    try {
        const { nombre, prompt_reglas, paginas_procesamiento } = req.body;
        if (!nombre || !prompt_reglas) {
            return res.status(400).json({ error: "Nombre y reglas son requeridos." });
        }
        // Fix: Permitir 0 como valor válido usando undefined check o nullish coalescing
        const nuevaEmpresa = await Empresa.create({
            nombre,
            prompt_reglas,
            paginas_procesamiento: paginas_procesamiento !== undefined ? paginas_procesamiento : 2
        });
        res.json(nuevaEmpresa);
    } catch (error) {
        console.error("Error creating empresa:", error);
        res.status(500).json({ error: "Error al crear empresa." });
    }
});

app.put('/api/empresas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, prompt_reglas } = req.body;
        const empresa = await Empresa.findByPk(id);

        if (!empresa) return res.status(404).json({ error: "Empresa no encontrada." });

        if (nombre) empresa.nombre = nombre;
        if (prompt_reglas) empresa.prompt_reglas = prompt_reglas;
        // Fix: Permitir actualizar a 0 checking undefined
        if (req.body.paginas_procesamiento !== undefined) empresa.paginas_procesamiento = req.body.paginas_procesamiento;

        await empresa.save();
        res.json(empresa);
    } catch (error) {
        console.error("Error updating empresa:", error);
        res.status(500).json({ error: "Error al actualizar empresa." });
    }
});

app.delete('/api/empresas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const empresa = await Empresa.findByPk(id);
        if (!empresa) return res.status(404).json({ error: "Empresa no encontrada." });

        await empresa.destroy();
        res.json({ message: "Empresa eliminada correctamente." });
    } catch (error) {
        console.error("Error deleting empresa:", error);
        res.status(500).json({ error: "Error al eliminar empresa." });
    }
});

// --- FIN ABM EMPRESAS ---

app.get('/api/quotes', async (req, res) => {
    try {
        const quotes = await Cotizacion.findAll({
            include: [{ model: DetalleCotizacion, as: 'detalles' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(quotes);
    } catch (error) {
        console.error("Error fetching quotes:", error);
        res.status(500).json({ error: "Error al obtener historial." });
    }
});

app.delete('/api/quotes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const quote = await Cotizacion.findByPk(id, {
            include: [{ model: DetalleCotizacion, as: 'detalles' }]
        });

        if (!quote) return res.status(404).json({ error: "Cotización no encontrada" });

        // 1. Eliminar archivos físicos asociados
        if (quote.detalles && quote.detalles.length > 0) {
            quote.detalles.forEach(detalle => {
                if (detalle.rutaArchivo) {
                    const filePath = path.join(__dirname, detalle.rutaArchivo);
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`Archivo eliminado: ${filePath}`);
                        } catch (err) {
                            console.error(`Error eliminando archivo ${filePath}:`, err);
                        }
                    }
                }
            });
        }

        // 2. Eliminar registros en DB (Cascade debería borrar detalles, pero forzamos por seguridad lógica)
        await DetalleCotizacion.destroy({ where: { CotizacionId: id } });
        await quote.destroy();

        res.json({ message: "Cotización y archivos eliminados correctamente." });

    } catch (error) {
        console.error("Error deleting quote:", error);
        res.status(500).json({ error: "Error al eliminar la cotización." });
    }
});

// --- EDICIÓN Y APRENDIZAJE DE DETALLES ---
app.put('/api/quote-details/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, prima_uf3, prima_uf5, prima_uf10, taller_marca, rc_monto, observaciones, learn } = req.body;

        const detalle = await DetalleCotizacion.findByPk(id);
        if (!detalle) return res.status(404).json({ error: "Detalle no encontrado." });

        // Guardar valores anteriores para "Aprender"
        const previousValues = {
            plan: detalle.plan,
            prima_uf3: detalle.prima_uf3,
            prima_uf5: detalle.prima_uf5,
            prima_uf10: detalle.prima_uf10,
            taller_marca: detalle.taller_marca,
            rc_monto: detalle.rc_monto
            // Otros campos si fueran necesarios
        };

        // Actualizar Detalle
        if (plan !== undefined) detalle.plan = plan;
        if (prima_uf3 !== undefined) detalle.prima_uf3 = prima_uf3;
        if (prima_uf5 !== undefined) detalle.prima_uf5 = prima_uf5;
        if (prima_uf10 !== undefined) detalle.prima_uf10 = prima_uf10;
        if (taller_marca !== undefined) detalle.taller_marca = taller_marca;
        if (rc_monto !== undefined) detalle.rc_monto = rc_monto;
        if (observaciones !== undefined) detalle.observaciones = observaciones;

        await detalle.save();

        // LÓGICA DE APRENDIZAJE (FEEDBACK LOOP)
        if (learn && detalle.empresa_id) {
            console.log(`🧠 APRENDIZAJE ACTIVADO para Empresa ID: ${detalle.empresa_id}`);

            // Comparar y guardar reglas
            const fieldsToCheck = [
                { key: 'plan', dbField: 'plan' }, // key en body, dbField en model
                { key: 'prima_uf3', dbField: 'primas.uf_3' }, // dbField como lo ve la IA (JSON structure hint)
                { key: 'prima_uf5', dbField: 'primas.uf_5' },
                { key: 'prima_uf10', dbField: 'primas.uf_10' },
                { key: 'taller_marca', dbField: 'caracteristicas.taller_marca' },
                { key: 'rc_monto', dbField: 'caracteristicas.rc' }
            ];

            const rulesToCreate = [];

            fieldsToCheck.forEach(field => {
                const newValue = req.body[field.key];
                const oldValue = previousValues[field.key];

                // Normalizar valores para comparación (evitar falso positivo '54' vs 54 o null vs '')
                const normalize = (val) => {
                    if (val === null || val === undefined) return '';
                    return String(val).trim();
                };

                const valIncorrecto = normalize(oldValue);
                const valCorrecto = normalize(newValue);

                // Solo aprender si hay diferencia real y el valor no estaba vacío originalmente 
                // (no queremos aprender que "nada" es incorrecto, salvo casos muy específicos, 
                // pero por seguridad pedimos que haya un valor previo incorrecto para corregir)
                if (valIncorrecto !== valCorrecto && valIncorrecto !== '' && valCorrecto !== '') {
                    console.log(`  -> Detectada corrección en '${field.key}': '${valIncorrecto}' => '${valCorrecto}'`);
                    rulesToCreate.push({
                        empresa_id: detalle.empresa_id,
                        campo: field.dbField,
                        valor_incorrecto: valIncorrecto,
                        valor_correcto: valCorrecto
                    });
                }
            });

            if (rulesToCreate.length > 0) {
                await CorrectionRule.bulkCreate(rulesToCreate);
                console.log(`  ✅ ${rulesToCreate.length} reglas de corrección aprendidas.`);
            } else {
                console.log("  ℹ️ No se detectaron cambios sustanciales para aprender (o faltaban valores previos).");
            }
        }

        res.json({ message: "Detalle actualizado.", detalle });

    } catch (error) {
        console.error("Error updating quote detail:", error);
        res.status(500).json({ error: "Error al actualizar detalle." });
    }
});

app.get('/api/quotes/:id/excel', async (req, res) => {
    try {
        const { id } = req.params;
        const quote = await Cotizacion.findByPk(id, {
            include: [{ model: DetalleCotizacion, as: 'detalles' }]
        });

        if (!quote) return res.status(404).json({ error: "Cotización no encontrada" });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Comparativa Seguros');

        // --- ESTILOS ---
        const headerStyle = {
            font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } },
            alignment: { horizontal: 'center' },
            border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        };

        const cellBorder = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };

        // --- CABECERA MAESTRA (Cliente) ---
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = 'COTIZACIÓN DE SEGURO AUTOMOTRIZ';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        worksheet.addRow(['Fecha:', new Date(quote.createdAt).toLocaleDateString(), '', 'Cliente:', quote.asegurado || 'S/N']);
        worksheet.addRow(['ID Cotización:', quote.id, '', 'Vehículo:', quote.vehiculo || 'S/N']);
        worksheet.addRow([]); // Espacio

        // --- CABECERA TABLA DETALLES ---
        const headers = ['Compañía', 'Plan', 'UF 3', 'UF 5', 'UF 10', 'Taller Marca', 'RC', 'Observaciones'];
        const headerRow = worksheet.addRow(headers);

        headerRow.eachCell((cell) => {
            cell.style = headerStyle;
        });

        // --- DATOS ---
        if (quote.detalles && quote.detalles.length > 0) {
            quote.detalles.forEach(d => {
                const row = worksheet.addRow([
                    d.compania,
                    d.plan,
                    d.prima_uf3 || '-',
                    d.prima_uf5 || '-',
                    d.prima_uf10 || '-',
                    d.taller_marca || 'NO',
                    d.rc_monto || '-',
                    d.observaciones || ''
                ]);

                // Aplicar bordes a la fila
                row.eachCell((cell) => {
                    cell.border = cellBorder;
                    cell.alignment = { wrapText: true, vertical: 'middle' };
                });
            });
        }

        // Ajustar anchos
        worksheet.getColumn(1).width = 15; // Cia
        worksheet.getColumn(2).width = 25; // Plan
        worksheet.getColumn(3).width = 10; // UF3
        worksheet.getColumn(4).width = 10; // UF5
        worksheet.getColumn(5).width = 10; // UF10
        worksheet.getColumn(6).width = 15; // Taller
        worksheet.getColumn(7).width = 20; // RC
        worksheet.getColumn(8).width = 50; // Obs

        // Respuesta Stream
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Cotizacion-${id}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).json({ error: "Error al generar Excel." });
    }
});

// --- CONFIGURACIÓN GLOBAL ---

app.get('/api/config', async (req, res) => {
    try {
        const params = await Parametro.findAll();
        // Convertir a objeto simple para el frontend
        const config = {};
        params.forEach(p => config[p.parametro] = p.valor);
        res.json(config);
    } catch (error) {
        console.error("Error fetching config:", error);
        res.status(500).json({ error: "Error al obtener configuración." });
    }
});

app.put('/api/config', async (req, res) => {
    try {
        const { GEMINI_API_KEY, OPENAI_API_KEY, IA_CONFIG } = req.body;

        if (GEMINI_API_KEY !== undefined) await Parametro.upsert({ parametro: 'GEMINI_API_KEY', valor: GEMINI_API_KEY });
        if (OPENAI_API_KEY !== undefined) await Parametro.upsert({ parametro: 'OPENAI_API_KEY', valor: OPENAI_API_KEY });

        // El frontend enviará el objeto completo IA_CONFIG
        if (IA_CONFIG) {
            await Parametro.upsert({ parametro: 'IA_CONFIG', valor: JSON.stringify(IA_CONFIG) });
        }

        res.json({ message: "Configuración actualizada correctamente." });
    } catch (error) {
        console.error("Error updating config:", error);
        res.status(500).json({ error: "Error al actualizar configuración." });
    }
});

// --- GENERIC PARAMETERS ABM ---
app.post('/api/parameters', async (req, res) => {
    try {
        const { parametro, valor } = req.body;
        if (!parametro) return res.status(400).json({ error: "El nombre del parámetro es requerido." });

        // Upsert permite crear o editar
        await Parametro.upsert({ parametro, valor });
        res.json({ message: "Parámetro guardado correctamente." });
    } catch (error) {
        console.error("Error saving parameter:", error);
        res.status(500).json({ error: "Error al guardar parámetro." });
    }
});

app.delete('/api/parameters/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const deleted = await Parametro.destroy({ where: { parametro: key } });
        if (deleted) {
            res.json({ message: "Parámetro eliminado." });
        } else {
            res.status(404).json({ error: "Parámetro no encontrado." });
        }
    } catch (error) {
        console.error("Error deleting parameter:", error);
        res.status(500).json({ error: "Error al eliminar parámetro." });
    }
});
// --- FIN GENERIC PARAMETERS ---
// --- FIN CONFIGURACIÓN GLOBAL ---

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("UNKNOWN SERVER ERROR:", err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
});

// Debug Exit
process.on('exit', (code) => {
    console.log(`Process exited with code: ${code}`);
});

// SIGINT handler removed for debugging

process.on('beforeExit', (code) => {
    console.log('Process beforeExit code:', code);
});



// --- LOGICA DE GENERACIÓN WORD ---
const createReport = require('docx-templates').default;

// Endpoint para subir plantilla
app.post('/api/config/template', upload.single('template'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }
    // Mover a una ubicación fija para uso posterior
    const templateDir = path.join(__dirname, 'uploads', 'templates');
    if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });

    const templatePath = path.join(templateDir, 'plantilla_presupuesto.docx');
    fs.renameSync(req.file.path, templatePath);
    res.json({ message: 'Plantilla de presupuesto actualizada con éxito.' });
});

// Endpoint para descargar plantilla de ejemplo
app.get('/api/config/template/sample', (req, res) => {
    // Intentar servir la nueva plantilla con instrucciones
    let templatePath = path.join(__dirname, 'uploads', 'doc', 'plantilla_ejemplo.docx');

    console.log("[DEBUG] Checking template path:", templatePath);
    if (!fs.existsSync(templatePath)) {
        console.log("[DEBUG] Path not found, trying fallback...");
        // Fallback a la antigua si no existe la nueva
        templatePath = path.join(__dirname, 'uploads', 'templates', 'ejemplo_base.docx');
    }

    if (!fs.existsSync(templatePath)) {
        console.log("[DEBUG] Fallback failed too:", templatePath);
        return res.status(404).json({ error: 'La plantilla de ejemplo no se ha generado.' });
    }

    res.download(templatePath, 'Plantilla_Ejemplo_Cotizador.docx');
});

// Endpoint para descargar Word generado
app.get('/api/quotes/:id/word', async (req, res) => {
    try {
        const { id } = req.params;
        const quote = await Cotizacion.findByPk(id, {
            include: [{ model: DetalleCotizacion, as: 'detalles' }]
        });

        if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

        // Primero intentar con la plantilla personalizada
        let templatePath = path.join(__dirname, 'uploads', 'templates', 'plantilla_presupuesto.docx');

        // Si no existe, usar la plantilla de ejemplo por defecto
        if (!fs.existsSync(templatePath)) {
            console.log("No custom template found, using default example.");
            templatePath = path.join(__dirname, 'uploads', 'doc', 'plantilla_ejemplo.docx');
        }

        if (!fs.existsSync(templatePath)) {
            // Último intento: buscar la vieja por si acaso
            const oldPath = path.join(__dirname, 'uploads', 'templates', 'ejemplo_base.docx');
            if (fs.existsSync(oldPath)) {
                templatePath = oldPath;
            } else {
                return res.status(404).json({ error: 'No hay plantilla configurada ni por defecto.' });
            }
        }

        const templateBuffer = fs.readFileSync(templatePath);

        // Preparar datos para la plantilla
        const data = {
            cliente: quote.asegurado || 'Cliente',
            fecha: new Date(quote.createdAt).toLocaleDateString(),
            vehiculo: quote.vehiculo || 'Vehículo',
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

        const buffer = await createReport({
            template: templateBuffer,
            data: data,
            cmdDelimiter: '+++' // Usaremos +++variable+++ en el Word
        });

        // Guardar archivo temporalmente como solicitó el usuario
        const tempFileName = `Presupuesto_${id}.docx`;
        const tempFilePath = path.join(__dirname, 'uploads', 'temp', tempFileName);

        // Asegurar que exista carpeta temp (ya debería, pero por seguridad)
        const tempDir = path.dirname(tempFilePath);
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        fs.writeFileSync(tempFilePath, Buffer.from(buffer));
        console.log(`Word generado y guardado en temp: ${tempFilePath}`);

        // Descargar archivo físico
        res.download(tempFilePath, tempFileName, (err) => {
            if (err) {
                console.error("Error en descarga de archivo:", err);
                // Opcional: limpiar archivo si falla, o dejarlo para debug
            } else {
                // Opcional: limpiar archivo después de descarga exitosa
                // fs.unlinkSync(tempFilePath); 
                // El usuario pidió "usar el /temp para generar", a veces prefieren persistencia momentánea. Lo dejamos.
            }
        });

    } catch (error) {
        console.error("Error generando Word:", error);
        res.status(500).json({ error: "Error al generar el documento Word." });
    }
});

// Endpoint para descargar Word generado (Single Detail)
app.get('/api/quote-details/:id/word', async (req, res) => {
    try {
        const { id } = req.params;
        const detalle = await DetalleCotizacion.findByPk(id, {
            include: [{ model: Cotizacion }] // Necesitamos datos del cliente/vehículo
        });

        if (!detalle) return res.status(404).json({ error: 'Detalle no encontrado' });
        const quote = detalle.Cotizacion;

        const templatePath = path.join(__dirname, 'uploads', 'templates', 'plantilla_presupuesto.docx');
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ error: 'No hay plantilla configurada.' });
        }

        const templateBuffer = fs.readFileSync(templatePath);

        // Preparar datos (Reutilizamos estructura de array para que la plantilla única sirva igual)
        const data = {
            cliente: quote.asegurado || 'Cliente',
            fecha: new Date(quote.createdAt).toLocaleDateString(),
            vehiculo: quote.vehiculo || 'Vehículo',
            detalles: [{
                compania: detalle.compania,
                plan: detalle.plan,
                prima_uf3: detalle.prima_uf3 || '-',
                prima_uf5: detalle.prima_uf5 || '-',
                prima_uf10: detalle.prima_uf10 || '-',
                taller: detalle.taller_marca || '-',
                rc: detalle.rc_monto || '-'
            }]
        };

        const buffer = await createReport({
            template: templateBuffer,
            data: data,
            cmdDelimiter: '+++'
        });

        res.setHeader('Content-Disposition', `attachment; filename=Presupuesto_${detalle.compania}_${id}.docx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error("Error generando Word Detalle:", error);
        res.status(500).json({ error: "Error al generar documento." });
    }
});


// Start Server AFTER DB Connection
connectDB().then(() => {
    // Sincronizar modelos y arrancar servidor
    // alter: true actualiza las tablas si hay cambios en modelos
    sequelize.sync().then(() => {
        app.listen(port, () => {
            console.log(`Servidor escuchando en http://localhost:${port}`);
            console.log("SERVER IS READY AND WAITING FOR REQUESTS...");


        });
    });
}).catch(err => {
    console.error("Failed to connect to DB, server not started:", err);
});
