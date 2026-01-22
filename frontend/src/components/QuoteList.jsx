import React from 'react';
import { Card, CardContent, Typography, Grid, Chip, Box, Divider, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const QuoteList = ({ data }) => {
    if (!data) return null;

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `cotizacion_${data.asegurado || 'export'}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Resultado del Análisis</Typography>
                    <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon fontSize="small" /> Procesado con Éxito
                    </Typography>
                </Box>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
                    Descargar JSON
                </Button>
            </Box>

            {/* Resumen Cliente/Auto */}
            <Card sx={{ mb: 3, bgcolor: 'background.paper', backgroundImage: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1))' }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="overline" color="text.secondary">Asegurado</Typography>
                            <Typography variant="h6">{data.asegurado || 'No identificado'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="overline" color="text.secondary">Vehículo</Typography>
                            <Typography variant="h6">{data.vehiculo || 'No identificado'}</Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Grid de Cotizaciones */}
            <Grid container spacing={3}>
                {data.cotizaciones && data.cotizaciones.map((quote, index) => (
                    <Grid item xs={12} md={6} lg={4} key={index}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', borderColor: 'primary.main', border: '1px solid' } }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom color="text.primary">
                                    {quote.compania || 'Compañía Desconocida'}
                                </Typography>
                                <Typography variant="body2" color="secondary" sx={{ fontWeight: 600, mb: 2 }}>
                                    {quote.plan || 'Plan Base'}
                                </Typography>

                                <Box sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 2, borderRadius: 1, mb: 2 }}>
                                    <Grid container justifyContent="space-between" textAlign="center">
                                        <Grid item>
                                            <Typography variant="caption" color="text.secondary">UF 3</Typography>
                                            <Typography variant="body1" color="success.main" fontWeight="bold">{quote.primas?.uf3 || '-'}</Typography>
                                        </Grid>
                                        <Grid item>
                                            <Typography variant="caption" color="text.secondary">UF 5</Typography>
                                            <Typography variant="body1" color="success.main" fontWeight="bold">{quote.primas?.uf5 || '-'}</Typography>
                                        </Grid>
                                        <Grid item>
                                            <Typography variant="caption" color="text.secondary">UF 10</Typography>
                                            <Typography variant="body1" color="success.main" fontWeight="bold">{quote.primas?.uf10 || '-'}</Typography>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Divider sx={{ my: 1 }} />

                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2"><strong>RC:</strong> {quote.rc_monto} <Typography component="span" variant="caption" color="text.secondary">({quote.rc_tipo})</Typography></Typography>
                                    <Typography variant="body2"><strong>Taller:</strong> {quote.taller_marca}</Typography>
                                    <Typography variant="body2"><strong>Reposición:</strong> {quote.reposicion_meses ? `${quote.reposicion_meses} meses` : '-'}</Typography>
                                </Box>

                                {quote.observaciones && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 2, fontStyle: 'italic', color: 'secondary.main' }}>
                                        "{quote.observaciones}"
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {(!data.cotizaciones || data.cotizaciones.length === 0) && (
                <Typography textAlign="center" color="text.secondary" sx={{ mt: 4 }}>
                    No se encontraron cotizaciones en el documento.
                </Typography>
            )}
        </Box>
    );
};

export default QuoteList;
