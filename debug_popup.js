const { Cotizacion, DetalleCotizacion } = require('./models/mysql_models');
(async () => {
    try {
        const lastQuote = await Cotizacion.findOne({ order: [['id', 'DESC']], include: [{ model: DetalleCotizacion, as: 'detalles' }] });
        console.log('--- QUOTE ID:', lastQuote.id);
        const d = lastQuote.detalles[0];
        console.log('--- UF3:', d.prima_uf3);
        console.log('--- UF5:', d.prima_uf5);
        console.log('--- UF10:', d.prima_uf10);
    } catch (e) { console.error(e) }
    process.exit(0);
})();
