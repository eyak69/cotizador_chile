const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const { Empresa } = require('../../models/mysql_models');

// Función auxiliar para convertir archivo a GenerativePart
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: fs.readFileSync(path).toString("base64"),
      mimeType
    },
  };
}

async function interpretQuoteData(filePath, originalFileName = "", config = {}) {
  const apiKey = config.apiKey;
  const modelName = config.modelName || "gemini-1.5-flash";

  if (!apiKey) return { error: "Falta API Key de Gemini en configuración." };

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  console.log(`--> Iniciando interpretQuoteData (Gemini: ${modelName}) con archivo: ${filePath}`);
  console.log(`--> Config Debug Mode: ${config.debugMode}`);

  try {

    // Obtener reglas de empresas (Especificas desde config o todas desde la BD)
    let reglasEmpresas = "";

    if (config.specificPromptRules) {
      // Uso EXCLUSIVO de reglas pasadas por parámetro (Estrategia Secuencial)
      reglasEmpresas = `Reglas ESPECÍFICAS para este archivo:\n${config.specificPromptRules}`;
      console.log("--> Usando Prompt Específico de Empresa seleccionado.");
    } else {
      // Fallback: Cargar todas si no se especificó una
      const { Empresa, CorrectionRule } = require('../../models/mysql_models');
      const empresas = await Empresa.findAll();

      if (empresas.length > 0) {
        reglasEmpresas = empresas.map(e => `Reglas para ${e.nombre}:\n${e.prompt_reglas}`).join("\n\n");
      } else {
        console.warn("⚠️ No se encontraron reglas de empresas en la BD. Usando prompt base genérico.");
      }
    }

    // --- LOGICA DE INYECCIÓN DE REGLAS APRENDIDAS (FEEDBACK LOOP) ---
    // Si tenemos empresa específica (ya sea por config o por detección previa que debamos pasar en config, 
    // pero por ahora cargaremos TODAS las reglas si no es específico, o lo ideal es filtrar).
    // Para simplificar: cargaremos TODAS las reglas de corrección agrupadas por empresa.

    let learningContext = "";
    try {
      const { CorrectionRule, Empresa } = require('../../models/mysql_models');
      const allRules = await CorrectionRule.findAll({ include: [Empresa] });

      if (allRules.length > 0) {
        const rulesText = allRules.map(r =>
          `- Para ${r.Empresa ? r.Empresa.nombre : 'Cualquier Empresa'}: Si ves "${r.valor_incorrecto}" en el campo "${r.campo}", CORRÍGELO a "${r.valor_correcto}".`
        ).join("\n");

        learningContext = `\n\nATENCIÓN - APRENDIZAJE DE ERRORES PREVIOS (Override):
El usuario ha corregido manualmente errores anteriores. APLICA ESTAS CORRECCIONES SIEMPRE:
${rulesText}
---------------------------------------------------`;
        console.log(`🧠 Se inyectaron ${allRules.length} reglas de aprendizaje al prompt.`);
      }
    } catch (errRules) {
      console.warn("⚠️ Error cargando reglas de aprendizaje:", errRules.message);
    }
    // ------------------------------------------------------------------    

    const prompt = `Contexto: Actúa como un analista de seguros experto en la estructura de documentos de aseguradoras en Chile (SURA, MAPFRE, HDI, etc.). Tu tarea es procesar el texto extraído (OCR) de una cotización de vehículo motorizado y normalizar los datos.

INSTRUCCIONES ESPECÍFICAS POR EMPRESA (Prioridad Máxima):
INSTRUCCIONES ESPECÍFICAS POR EMPRESA (Prioridad Máxima):
${reglasEmpresas}
${learningContext}



Estructura Final a completar (JSON puro):
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

    const imagePart = fileToGenerativePart(filePath, "application/pdf");


    if (config.debugMode) {
      console.log("--------------- PROMPT ENVIADO A GEMINI ---------------");
      console.log(prompt);
      console.log("-------------------------------------------------------");
    }

    // --- RETRY LOGIC FOR 503 OVERLOADED ---
    const MAX_RETRIES = 3;
    let attempt = 0;
    let result = null;
    let lastError = null;

    while (attempt <= MAX_RETRIES) {
      try {
        if (attempt > 0) {
          // Estrategia más agresiva: 5s, 10s, 20s
          const delay = Math.pow(2, attempt) * 2500;
          console.log(`⚠️ Intento ${attempt}/${MAX_RETRIES} falló (503). Reintentando en ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        result = await model.generateContent([prompt, imagePart]);
        break; // Éxito, salir del loop

      } catch (e) {
        lastError = e;
        if (e.message.includes("503") || e.message.includes("Overloaded") || e.message.includes("429")) {
          attempt++;
          if (attempt > MAX_RETRIES) throw e; // Rendirse después de max intentos
        } else {
          throw e; // Otros errores (400, 401) no se reintentan
        }
      }
    }

    const response = await result.response;

    // Safety check: Verificar si hay candidatos válidos antes de llamar a text()
    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
      console.warn("⚠️ ALERTA IA: La respuesta fue bloqueada o está vacía (posible Safety Filter).");
      if (response.promptFeedback) {
        console.warn("Feedback Bloqueo:", JSON.stringify(response.promptFeedback));
      }
      throw new Error("Respuesta de IA bloqueada por filtros de seguridad o vacía.");
    }

    const text = response.text();

    if (config.debugMode) {
      console.log("--------------- RESPUESTA RAW GEMINI ------------------");
      console.log(text);
      console.log("-------------------------------------------------------");
    }

    // Limpiar markdown json si existe
    let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // EXTRACCIÓN ROBUSTA: Si todavía hay texto antes o después del JSON (ej: "Aquí está el JSON: { ... }")
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    } else {
      console.warn("⚠️ Advertencia: No se encontraron llaves {} en la respuesta de la IA. Posible error de formato.");
    }

    return JSON.parse(jsonString);

  } catch (error) {
    // Si es error 503 Service Unavailable, sugerir reintento (aunque idealmente haríamos un loop aquí con delay)
    if (error.message.includes("503") || error.message.includes("Overloaded")) {
      console.warn("⚠️ Modelo sobrecargado (503).");
    }

    const errorMsg = `[${new Date().toISOString()}] CRITICAL ERROR: ${error.message}\nStack: ${error.stack}\n\n`;
    fs.appendFileSync('error_log.txt', errorMsg);
    console.error('CRITICAL ERROR al interpretar con Gemini:', error);

    // Fallback estructura vacía con mensaje de error claro
    return {
      asegurado: "Error de Lectura",
      vehiculo: `ERROR IA: ${error.message.includes('503') ? 'Servicio Saturado (Intente de nuevo)' : error.message}`,
      comparativa_seguros: [],
      error: error.message // Flag para el server
    };
  }
}

module.exports = { interpretQuoteData };
