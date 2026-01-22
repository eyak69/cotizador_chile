const OpenAI = require("openai");
const fs = require('fs');
const pdf = require('pdf-parse');

async function interpretQuoteData(filePath, originalFileName = "", config = {}) {
  const apiKey = config.apiKey;
  const modelName = config.modelName || "gpt-4o";

  if (!apiKey) return { error: "Falta API Key de OpenAI en configuración." };

  const openai = new OpenAI({ apiKey: apiKey });

  console.log(`--> Iniciando interpretQuoteData (OpenAI: ${modelName}) con archivo: ${filePath}`);

  try {
    // 1. Leer y extraer texto del PDF (Volvemos a pdf-parse que funciona bien)
    const dataBuffer = fs.readFileSync(filePath);
    // Leemos todo el PDF sin limites de paginas
    const pdfData = await pdf(dataBuffer);
    const pdfText = pdfData.text;

    // DEBUG: Guardar texto
    fs.writeFileSync('debug_last_pdf_content.txt', pdfText);

    // 2. Preparar el Prompt (Actualizado con instrucciones Críticas del Usuario)
    // Obtener reglas de empresas desde la BD
    const { Empresa } = require('./models/mysql_models');
    const empresas = await Empresa.findAll();
    let reglasEmpresas = "";

    if (empresas.length > 0) {
      reglasEmpresas = empresas.map(e => `Reglas para ${e.nombre}:\n${e.prompt_reglas}`).join("\n\n");
    }

    const systemPrompt = `Contexto: Actúa como un analista de seguros experto en la estructura de documentos de aseguradoras en Chile (SURA, MAPFRE, HDI, etc.). Tu tarea es procesar el texto extraído (OCR) de una cotización de vehículo motorizado y normalizar los datos.

INSTRUCCIONES ESPECÍFICAS POR EMPRESA (Prioridad Máxima):
${reglasEmpresas}

Estructura Final a completar:
IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON válido. NO incluyas introducciones como "Aquí está el análisis", "El documento...", ni formato markdown. SOLO EL JSON.

{
  "asegurado": "Nombre del Asegurado (si aparece)",
  "vehiculo": "Marca y Modelo (si aparece)",
  "comparativa_seguros": [
    {
      "compania": "Nombre",
      "plan": "Nombre",
      "primas": {
        "uf_3": 0.00,
        "uf_5": 0.00,
        "uf_10": 0.00
      },
      "caracteristicas": {
        "rc": "UF XXXX (Tipo)",
        "taller_marca": "SI/NO",
        "reposicion_nuevo_meses": 0,
        "otros_beneficios": "Texto"
      }
    }
  ]
}`;

    const userPrompt = `
    Analiza la siguiente información de una cotización de seguro de vehículo.
    
    INFORMACIÓN CLAVE:
    Nombre del Archivo: "${originalFileName}" (IMPORTANTE: Si el texto no menciona explícitamente la compañía, DEDÚCELA de aquí).

    TEXTO EXTRAÍDO DEL DOCUMENTO:
    """
    ${pdfText.substring(0, 50000)}
    """
    `;

    if (config.debugMode) {
      console.log("--------------- PROMPT SISTEMA OPENAI ---------------");
      console.log(systemPrompt);
      console.log("--------------- PROMPT USUARIO OPENAI ---------------");
      console.log(userPrompt);
      console.log("-----------------------------------------------------");
    }

    // 3. Llamar a GPT-4o (Modo Texto Normal)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const resultText = completion.choices[0].message.content;

    if (config.debugMode) {
      console.log("--------------- RESPUESTA RAW OPENAI ----------------");
      console.log(resultText);
      console.log("-----------------------------------------------------");
    }

    console.log("--> Respuesta OpenAI recibida.");

    return JSON.parse(resultText);

  } catch (error) {
    const errorMsg = `[${new Date().toISOString()}] OPENAI ERROR: ${error.message}\nStack: ${error.stack}\n\n`;
    fs.appendFileSync('error_log_openai.txt', errorMsg);
    console.error('CRITICAL ERROR al interpretar con OpenAI:', error);

    return {
      asegurado: "Error OpenAI",
      vehiculo: `ERROR: ${error.message}`,
      comparativa_seguros: []
    };
  }
}

module.exports = { interpretQuoteData };
