const { Cotizacion, DetalleCotizacion, Empresa } = require('./models/mysql_models');
(async () => {
    try {
        const lastQuotes = await Cotizacion.findAll({ order: [['id', 'DESC']], limit: 1, include: [{ model: DetalleCotizacion, as: 'detalles' }] });
        const lastQuote = lastQuotes[0];
        console.log('--- QUOTE ID:', lastQuote.id);
        const pages = lastQuote.detalles.map(d => ({ compania: d.compania, paginas: d.paginas_encontradas }));
        console.log('--- FOUND PAGES IN DETAILS:', pages);
        const opt = lastQuote.getDataValue('optimization_suggestion');
        console.log('--- OPT SUGGESTION IN DB:', opt);

        // Simular lógica backend
        const selectedEmpresa = await Empresa.findByPk(lastQuote.detalles[0].empresa_id);
        console.log("--- EMPRESA EN DB:", selectedEmpresa.nombre, "- PAGINAS CONF:", selectedEmpresa.paginas_procesamiento);

        const forceOptimizationSuggestion = true; // Simulamos que hubo reintento

        let triggerSuggestion = true;
        let optimization_suggestion = null;
        if (selectedEmpresa && triggerSuggestion) {
            const allFoundPages = new Set();
            if (pages.length > 0) {
                pages.forEach(c => {
                    if (c.paginas) {
                        const pp = Array.isArray(c.paginas) ? c.paginas : [c.paginas];
                        pp.forEach(p => {
                            const parts = String(p).split(',');
                            parts.forEach(part => {
                                const pNum = parseInt(part);
                                if (!isNaN(pNum)) allFoundPages.add(pNum);
                            });
                        });
                    }
                });
            }

            if (allFoundPages.size > 0) {
                const sortedPages = Array.from(allFoundPages).sort((a, b) => a - b);
                const suggestedPagesStr = sortedPages.join(',');
                console.log("--- SUGGESTED STRING:", suggestedPagesStr);
                console.log("--- IS FORCED (RETRY):", forceOptimizationSuggestion);
                console.log("--- STRING COMPARISON:", String(selectedEmpresa.paginas_procesamiento) !== suggestedPagesStr);
                console.log("--- IF CONDITION:", (forceOptimizationSuggestion || String(selectedEmpresa.paginas_procesamiento) !== suggestedPagesStr));

                if (suggestedPagesStr && (forceOptimizationSuggestion || String(selectedEmpresa.paginas_procesamiento) !== suggestedPagesStr)) {
                    optimization_suggestion = {
                        companyId: selectedEmpresa.id,
                        companyName: selectedEmpresa.nombre,
                        currentPages: selectedEmpresa.paginas_procesamiento || '0',
                        suggestedPages: suggestedPagesStr,
                        message: `Test`
                    };
                }
            }
        }
        console.log("--- RESULTADO SIMULADO DE LA LOGICA EXTRAIDA:", optimization_suggestion);

    } catch (e) { console.error(e) }
    process.exit(0);
})();
