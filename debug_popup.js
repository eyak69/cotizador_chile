const { Cotizacion, DetalleCotizacion } = require('./models/mysql_models');
(async () => {
    try {
        const lastQuotes = await Cotizacion.findAll({ order: [['id', 'DESC']], limit: 1, include: [{ model: DetalleCotizacion, as: 'detalles' }] });
        const lastQuote = lastQuotes[0];
        console.log('--- QUOTE ID:', lastQuote.id);
        const pages = lastQuote.detalles.map(d => ({ compania: d.compania, paginas: d.paginas_encontradas }));
        console.log('--- FOUND PAGES IN DETAILS:', pages);
        const opt = lastQuote.getDataValue('optimization_suggestion');
        console.log('--- OPT SUGGESTION:', opt);
    } catch (e) { console.error(e) }
    process.exit(0);
})();
