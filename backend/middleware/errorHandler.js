const errorHandler = (err, req, res, next) => {
    console.error(`[Global Error Handler] Error en ${req.method} ${req.url}:`);
    console.error(err.stack || err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';

    res.status(statusCode).json({
        error: message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};

module.exports = errorHandler;
