require('dotenv').config();
const { connectDB, sequelize } = require('./database');
const { Empresa, Parametro } = require('./models/mysql_models');

const suraPrompt = `Reglas de Oro para SURA:

1. Conversión Decimal: SURA utiliza la coma (,) para decimales. Debes transformar obligatoriamente todas las comas en puntos (ej. 30,50 -> 30.50) para asegurar que el JSON sea numéricamente correcto.

2. Identificación de Primas (Regla de la Celda Doble): En las tablas de SURA, el valor anual y el valor de la cuota suelen aparecer en la misma celda (ej: "30,50 UF / 2,77 UF").
   Acción: Extrae siempre el primer valor (el más alto), que corresponde a la Prima Total Anual. Ignora el valor inferior de la cuota.

3. Mapeo de Deducibles:
   - D3 o D3 UF -> Deducible 3 UF.
   - D5 o D5 UF -> Deducible 5 UF.
   - D10 o D10 UF -> Deducible 10 UF.

4. Priorización de Escenarios: Si el documento presenta varias tablas de precios (Base vs. Con Opcionales), prioriza siempre la tabla que coincida con los "Opcionales" marcados en la página 1 (generalmente: Auto Reemplazo 30 días, Taller de Marca y RC en Exceso).

5. Lógica de Taller de Marca: En SURA, si en la sección "Opcionales" o "Detalle de Plan" aparece el check en "Taller de Marca", el valor es SI.`;

const mapfrePrompt = `Instrucciones de Extracción para MAPFRE:

1. Identificación de Documento Único: Reconoce que este documento es una póliza cerrada. Si el plan indica un deducible específico (ej. "PLAN FLEX DEDUCIBLE UF.5"), asigna la prima solo a ese campo y marca los demás como null. No intentes proyectar o calcular valores para otros deducibles.

2. Extracción de Prima Total: Localiza la "Prima Total" en la tabla de importes.
   Regla de Formato: Sustituye siempre la coma decimal por un punto (ej. 20,12 -> 20.12).

3. Lógica de Responsabilidad Civil (RC): En MAPFRE, la RC suele ser "Única y Combinada". Verifica si el monto de 1000 UF se repite para daño emergente, moral y lucro cesante. Si es así, descríbelo como "UF 1000 (Único y Combinado)".

4. Validación de Taller de Marca: Aplica la Cláusula de Antigüedad: MAPFRE garantiza taller oficial de la marca solo para vehículos con menos de dos años de antigüedad.
   Acción: Compara el año del vehículo (ej. 2015) con la fecha de emisión (2021/2022). Si la diferencia es mayor a 2 años, marca taller_marca: "NO (Por antigüedad)", a menos que una cláusula especial indique lo contrario.

5. Beneficios Destacados: Busca la sección de "Asistencia Total". Extrae si incluye "Auto de reemplazo ilimitado", "Conductor profesional" y el monto de la grúa.`;

const hdiPrompt = `Prompt Especializado: Extractor de Comparativas (VEAS / ANS)

Contexto: Actúa como un analista experto en seguros automotrices comerciales. Tu objetivo es extraer la información de una "Simulación de Seguros" que contiene múltiples ofertas (Zurich, BCI, FID) para un mismo vehículo.

Reglas de Extracción para este Formato:

1. Lectura de Matriz de Primas:
   - Ubica la tabla principal en la Página 1.
   - Cada fila es una compañía diferente. Debes extraer los valores para las columnas "UF 3", "UF 5" y "UF 10".
   - Limpieza: Convierte las comas en puntos (ej. 44,38 -> 44.38).
   - Si una celda está vacía o tiene guiones, devuelve null.

2. Lógica de Responsabilidad Civil (RC) Independiente:
   - En este formato (ANS), la RC suele ser Independiente para Daño Emergente, Moral y Lucro Cesante.
   - Zurich y BCI: Extraer UF 1000 Independiente.
   - FID: Extraer UF 500 Independiente.

3. Detección de Taller de Marca (Por Antigüedad):
   - Cruza el año del vehículo con la fecha de la cotización y las reglas de cada compañía:
   - BCI: Taller de marca hasta 3 años de antigüedad.
   - FID: Taller de marca hasta 12 meses de antigüedad.
   - Zurich: Taller de marca SI (según tabla de coberturas).

4. Captura de Promociones Especiales:
   - Busca específicamente si hay campañas vigentes. Para FID, detecta la promoción de "3 Cuotas Gratis" (cuotas 3, 6 y 9) si se emite en octubre.

5. Beneficios Específicos de Uso Comercial:
   - Identifica que es Uso Comercial y menciona beneficios como "GPS gratuito" (Ley Antiportonazo).`;

const ansPrompt = `Prompt Especializado: Analista de Comparativas ANS
Contexto: Actúa como un experto en análisis de datos de seguros para la corredora ANS. Tu objetivo es extraer la información de las tablas comparativas de simulación para vehículos motorizados.

Instrucciones de Extracción:
Manejo de Matrices de Precios:
* Identifica la tabla de primas en la primera página.
* Cada fila representa una combinación de Compañía + Producto.
* Extrae los valores de las columnas "UF 3", "UF 5" y "UF 10".
* Normalización: Convierte todas las comas en puntos decimales (ej. 44,38 -> 44.38).

Análisis de Responsabilidad Civil (RC):
* Busca en el "Cuadro Comparador de Coberturas" si la RC es "Independiente" o "Combinada".
* En ANS, generalmente se especifica si el límite de UF 1000 aplica por separado a Daño Emergente, Moral y Lucro Cesante.

Lógica de Taller de Marca por Antigüedad:
* Cruza el año del vehículo declarado en "Materia Asegurada" con las cláusulas de asignación de taller.
* Regla BCI: Taller de marca hasta 3 años de antigüedad.
* Regla FID: Taller de marca hasta 12 meses de antigüedad.
* Regla Zurich: Según el plan contratado (ej. Full Comercial suele incluirlo).

Detección de Campañas y GPS:
* Reporta si existe la promoción de "Cuotas Gratis" (típica de FID en ANS) y bajo qué condiciones (ej. cuotas 3, 6 y 9 gratis).
* Confirma la entrega de GPS gratuito según la Ley Antiportonazo.

Puntos Clave Detectados:
* Diversidad de Planes: Zurich, BCI, Renta Nacional y FID Chile.
* Normalización: Valores en UF anuales con IVA.
* Reposición a Nuevo: Zurich/BCI 24 meses vs FID/Renta 18 meses.
* RC: Estándar 1000 UF.
* Robo Accesorios: Plan Auto Pro Renta (100 UF) vs Promedio (50 UF).`;

async function seed() {
   try {
      await connectDB();
      await sequelize.sync(); // Asegura que la tabla exista

      await Empresa.upsert({ nombre: 'SURA', prompt_reglas: suraPrompt });
      await Empresa.upsert({ nombre: 'MAPFRE', prompt_reglas: mapfrePrompt });
      await Empresa.upsert({ nombre: 'HDI', prompt_reglas: hdiPrompt });
      await Empresa.upsert({ nombre: 'ANS', prompt_reglas: ansPrompt });

      // Seed Parámetros
      // LÓGICA SEGURA: Solo sobrescribir si hay valor en ENV. Si no, mantener el de la BD.
      if (process.env.GEMINI_API_KEY) {
         await Parametro.upsert({ parametro: 'GEMINI_API_KEY', valor: process.env.GEMINI_API_KEY });
      } else {
         // Si no hay en ENV, aseguramos que exista la clave aunque sea vacía, pero NO sobrescribimos si ya tiene valor
         const exists = await Parametro.findByPk('GEMINI_API_KEY');
         if (!exists) await Parametro.create({ parametro: 'GEMINI_API_KEY', valor: '' });
      }

      if (process.env.OPENAI_API_KEY) {
         await Parametro.upsert({ parametro: 'OPENAI_API_KEY', valor: process.env.OPENAI_API_KEY });
      } else {
         const exists = await Parametro.findByPk('OPENAI_API_KEY');
         if (!exists) await Parametro.create({ parametro: 'OPENAI_API_KEY', valor: '' });
      }

      // Seed DEFAULT DEBUG (Pedido Usuario: true por defecto)
      const debugExists = await Parametro.findByPk('DEBUG');
      if (!debugExists) {
         await Parametro.create({ parametro: 'DEBUG', valor: 'true' });
      }

      const newAiConfig = JSON.stringify({
         configuracion_ia: {
            modelo_por_defecto: "gemini-2.5-flash",
            proveedores: {
               google: {
                  nombre_comercial: "Google Gemini",
                  modelos: [
                     {
                        id_interno: "gemini_flash",
                        nombre: "GEMINI",
                        modelo: "gemini-2.5-flash",
                        temperatura: 0.1
                     },
                     {
                        id_interno: "gemini_pro",
                        nombre: "GEMINI PRO",
                        modelo: "gemini-1.5-pro",
                        temperatura: 0.0
                     }
                  ]
               },
               openai: {
                  nombre_comercial: "OpenAI GPT",
                  modelos: [
                     {
                        id_interno: "gpt_4o",
                        nombre: "GPT-4o",
                        modelo: "gpt-4o",
                        temperatura: 0.1
                     },
                     {
                        id_interno: "gpt_35_turbo",
                        nombre: "GPT-3.5 Turbo",
                        modelo: "gpt-3.5-turbo",
                        temperatura: 0.2
                     }
                  ]
               }
            }
         }
      });

      // Usaremos 'IA_CONFIG' para este nuevo objeto complejo
      await Parametro.upsert({ parametro: 'IA_CONFIG', valor: newAiConfig });

      // Eliminamos el anterior 'TIPO_IA' si existe para evitar confusión, o lo ignoramos
      await Parametro.destroy({ where: { parametro: 'TIPO_IA' } });

      console.log('Prompts de empresas y Parámetros (IA_CONFIG) sembrados correctamente.');
      process.exit(0);
   } catch (error) {
      console.error('Error seeding prompts:', error);
      process.exit(1);
   }
}

seed();
