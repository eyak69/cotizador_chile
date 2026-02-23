const { Cotizacion, DetalleCotizacion, Empresa } = require('./models/mysql_models');
(async () => {
    try {
        const lastQuote = await Cotizacion.findOne({ order: [['id', 'DESC']], include: [{ model: DetalleCotizacion, as: 'detalles' }, Empresa] });
        if (!lastQuote) { console.log('Sin cotizaciones'); process.exit(0); }
        console.log('--- LAST QUOTE ID:', lastQuote.id);
        console.log('--- LOTE:', lastQuote.loteId);
        console.log('--- EMPRESA ID:', lastQuote.Empresa ? lastQuote.Empresa.id : 'None');
        console.log('--- DETALLES LENGTH:', lastQuote.detalles ? lastQuote.detalles.length : 0);
        const pages = lastQuote.detalles.map(d => d.paginas_encontradas);
        console.log('--- FOUND PAGES IN DETAILS:', pages);
    } catch (e) { console.error(e) }
    process.exit(0);
})();
