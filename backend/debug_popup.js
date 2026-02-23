const { Cotizacion, DetalleCotizacion, Empresa } = require('./models/mysql_models');
(async () => {
    try {
        const lastQuotes = await Cotizacion.findAll({ order: [['id', 'DESC']], limit: 1, include: [{ model: DetalleCotizacion, as: 'detalles' }] });
        const lastQuote = lastQuotes[0];
        console.log('--- QUOTE ID:', lastQuote.id);
        const pages = lastQuote.detalles.map(d => ({ compania: d.compania, paginas: d.paginas_encontradas }));
        console.log('--- FOUND PAGES IN DETAILS:', pages);
        const opt = lastQuote.getDataValue('optimization_suggestion');
        console.log('--- OPT SUGGESTION:', opt);

        // Simular lógica backend
        const selectedEmpresa = await Empresa.findByPk(lastQuote.detalles[0].empresa_id);
        console.log("--- EMPRESA EN DB:", selectedEmpresa.nombre, "- PAGINAS CONF:", selectedEmpresa.paginas_procesamiento);

        const isUfCero = true; // Simulamos que hubo reintento

        let optimization_suggestion = null;
        const triggerSuggestion = isUfCero || (selectedEmpresa && (selectedEmpresa.paginas_procesamiento === '0' || selectedEmpresa.paginas_procesamiento === 0 || !selectedEmpresa.paginas_procesamiento));

        if (selectedEmpresa && triggerSuggestion) {
            const allFoundPages = new Set();
            if (pages.length > 0) {
                pages.forEach(c => {
                    if (c.paginas) {
                        const pp = Array.isArray(c.paginas) ? c.paginas : [c.paginas];
                        pp.forEach(p => {
                            // Ojo: split by comma first because pages might be '1,2,3'
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
                console.log("--- IS UF CERO (RETRY):", isUfCero);
                console.log("--- CONDICION:", (isUfCero || String(selectedEmpresa.paginas_procesamiento) !== suggestedPagesStr));

                if (suggestedPagesStr && (isUfCero || String(selectedEmpresa.paginas_procesamiento) !== suggestedPagesStr)) {
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
        console.log("--- OPTIMIZATION RESULTADO SIMULADO:", optimization_suggestion);

    } catch (e) { console.error(e) }
    process.exit(0);
})();
