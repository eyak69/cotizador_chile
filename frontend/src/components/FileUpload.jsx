import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button, CircularProgress, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert, Snackbar, Select, MenuItem, FormControl, InputLabel, Backdrop, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Chip } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import api from '../services/api';
import SparkMD5 from 'spark-md5';

const FileUpload = ({ onQuoteProcessed }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [files, setFiles] = useState([]); // Array of { file: File, md5: string, companyId: number|string }
    const [companies, setCompanies] = useState([]);
    const [showDebug, setShowDebug] = useState(false);
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [debugData, setDebugData] = useState(null);
    // Estado de progreso por archivo: { [md5]: 'pending' | 'processing' | 'done' | 'error' }
    const [fileProgress, setFileProgress] = useState({});

    // --- Estados de progreso en tiempo real ---
    const [completedCount, setCompletedCount] = useState(0);    // Cuantos terminaron
    const [elapsedSeconds, setElapsedSeconds] = useState(0);    // Cronometro global
    const [fileTimings, setFileTimings] = useState({});         // md5 -> segundos que tardó
    const [processingStart, setProcessingStart] = useState(null);
    const [completionStats, setCompletionStats] = useState(null); // Resumen final
    const timerRef = useRef(null);

    // Cronometro: actualiza cada segundo mientras loading=true
    useEffect(() => {
        if (loading && processingStart) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - processingStart) / 1000));
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [loading, processingStart]);

    // State for optimization suggestion
    const [suggestionOpen, setSuggestionOpen] = useState(false);
    const [suggestionData, setSuggestionData] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);

    React.useEffect(() => {
        api.get('/empresas')
            .then(res => setCompanies(res.data))
            .catch(err => console.error("Error cargando empresas:", err));

        // Cargar estado DEBUG (Opcional, desactivado para evitar 404 si no existe endpoint)
        // api.get('/parametros')...
    }, []);

    const calculateMD5 = (file) => {
        return new Promise((resolve, reject) => {
            const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
            const chunkSize = 2097152; // 2MB
            const chunks = Math.ceil(file.size / chunkSize);
            const spark = new SparkMD5.ArrayBuffer();
            const fileReader = new FileReader();
            let currentChunk = 0;

            fileReader.onload = function (e) {
                spark.append(e.target.result);
                currentChunk++;

                if (currentChunk < chunks) {
                    loadNext();
                } else {
                    const hash = spark.end();
                    resolve(hash);
                }
            };

            fileReader.onerror = function () {
                reject('Error leyendo archivo');
            };

            function loadNext() {
                const start = currentChunk * chunkSize;
                const end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
                fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
            }

            loadNext();
        });
    };

    const validatePdfMagicBytes = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const arr = new Uint8Array(e.target.result);
                // PDF magic bytes: %PDF- (hex: 25 50 44 46 2D)
                if (arr.length >= 5 && arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46 && arr[4] === 0x2D) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            };
            reader.onerror = () => resolve(false);
            reader.readAsArrayBuffer(file.slice(0, 5));
        });
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        setError(null);

        // 1. Calcular MD5 y Validar Binario de TODOS los archivos nuevos primero
        const calculatedFiles = [];
        for (const file of acceptedFiles) {
            try {
                // Validar primero si es realmente un PDF por dentro
                const isRealPdf = await validatePdfMagicBytes(file);
                if (!isRealPdf) {
                    setToastMsg(`🚨 Archivo Engañoso: "${file.name}" fue rechazado porque está disfrazado, no es un PDF real.`);
                    setToastOpen(true);
                    continue; // Saltar el archivo malicioso
                }

                const md5 = await calculateMD5(file);
                calculatedFiles.push({ file, md5 });
            } catch (err) {
                console.error("Error calculando hash o validando bytes", err);
            }
        }

        // 2. Actualizar estado de forma ATÓMICA
        setFiles(prevFiles => {
            const uniqueNewFiles = [];
            let duplicatesInBatch = 0;

            for (const candidate of calculatedFiles) {
                // Verificar contra el estado previo REAL (prevFiles)
                const existsInState = prevFiles.some(f => f.md5 === candidate.md5);
                // Verificar contra el lote actual
                const existsInBatch = uniqueNewFiles.some(f => f.md5 === candidate.md5);

                if (!existsInState && !existsInBatch) {
                    // PRE-SELECCIÓN AUTOMÁTICA DE EMPRESA
                    let matchedCompanyId = ''; // Default vacío (Obligatorio elegir)
                    if (companies && companies.length > 0) {
                        const fileNameUpper = candidate.file.name.toUpperCase();
                        const found = companies.find(c => fileNameUpper.includes(c.nombre.toUpperCase()));
                        if (found) matchedCompanyId = found.id;
                    }

                    // Agregamos companyId al objeto del archivo
                    uniqueNewFiles.push({ ...candidate, companyId: matchedCompanyId });
                } else {
                    duplicatesInBatch++;
                }
            }

            if (duplicatesInBatch > 0) {
                console.warn(`Se detectaron ${duplicatesInBatch} duplicados y fueron ignorados.`);
            }

            return [...prevFiles, ...uniqueNewFiles];
        });
    }, [companies]); // Agregamos 'companies' a dependencias para que el auto-match funcione

    const handleDeleteClick = (md5) => {
        setFileToDelete(md5);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (fileToDelete) {
            setFiles(files.filter(f => f.md5 !== fileToDelete));
        }
        setDeleteDialogOpen(false);
        setFileToDelete(null);
    };

    const cancelDelete = () => {
        setDeleteDialogOpen(false);
        setFileToDelete(null);
    };

    const handleCompanyChange = (md5, companyId) => {
        setFiles(files.map(f => f.md5 === md5 ? { ...f, companyId } : f));
    };

    const handlePreview = (file) => {
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
    };

    const processFiles = async () => {
        if (files.length === 0) return;

        setLoading(true);
        setError(null);
        setDebugData(null);
        setCompletionStats(null);
        onQuoteProcessed(null);

        // Generar ID de Lote Único
        const loteId = Date.now().toString();
        const batchStart = Date.now();
        setProcessingStart(batchStart);
        setCompletedCount(0);
        setElapsedSeconds(0);
        setFileTimings({});

        // Inicializar progreso de todos los archivos como 'pending'
        const initialProgress = {};
        files.forEach(f => { initialProgress[f.md5] = 'pending'; });
        setFileProgress(initialProgress);
        const totalFiles = files.length;

        const combinedDebug = [];
        let finalQuoteRecord = null;
        let firstSuggestion = null;

        // Función que procesa UN archivo con delay escalonado
        const processOneFile = async (fileObj, index) => {
            const { file, md5, companyId } = fileObj;
            const fileStart = Date.now();

            // Delay escalonado: archivo 0 → 0ms, archivo 1 → 2000ms, archivo 2 → 4000ms...
            if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, index * 2000));
            }

            setFileProgress(prev => ({ ...prev, [md5]: 'processing' }));

            const formData = new FormData();
            formData.append('loteId', loteId);
            formData.append('pdfFile', file);
            if (companyId) formData.append('companyId', companyId);

            const response = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-lote-id': loteId,
                    'x-file-md5': md5   // Para caché en backend — evita llamada a Gemini si ya fue procesado
                }
            });

            const timeTaken = Math.floor((Date.now() - fileStart) / 1000);
            setFileTimings(prev => ({ ...prev, [md5]: timeTaken }));
            setCompletedCount(prev => prev + 1);
            setFileProgress(prev => ({ ...prev, [md5]: 'done' }));
            return { file, data: response.data };
        };

        try {
            // Lanzar TODOS los archivos en paralelo con delays escalonados
            const results = await Promise.allSettled(
                files.map((fileObj, index) => processOneFile(fileObj, index))
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const { file, data } = result.value;
                    console.log(`✅ Respuesta [${file.name}]:`, data);

                    if (data.raw_ai_response) {
                        combinedDebug.push({ archivo: file.name, ai_json: data.raw_ai_response });
                    }
                    if (data.optimization_suggestion && !firstSuggestion) {
                        firstSuggestion = data.optimization_suggestion;
                    }
                    // Elegir el record con MAS detalles (no simplemente el último del array)
                    // El último en guardar en DB tiene todos los detalles acumulados del lote
                    const currentDetalles = data.detalles?.length ?? 0;
                    const prevDetalles = finalQuoteRecord?.detalles?.length ?? 0;
                    if (currentDetalles >= prevDetalles) {
                        finalQuoteRecord = data;
                    }
                } else {
                    // Marcar como error el archivo que falló
                    const idx = results.indexOf(result);
                    const failedFile = files[idx];
                    const failedMd5 = failedFile?.md5;
                    const errorMsg = result.reason?.response?.data?.error || result.reason?.message || 'Error desconocido';
                    console.error(`❌ Error en [${failedFile?.file?.name}]:`, result.reason);
                    if (failedMd5) setFileProgress(prev => ({ ...prev, [failedMd5]: 'error' }));
                    // Mostrar toast con el error específico
                    setToastMsg(`❌ ${failedFile?.file?.name ?? 'Archivo'}: ${errorMsg}`);
                    setToastOpen(true);
                }
            }

            if (firstSuggestion) {
                setSuggestionData(firstSuggestion);
                setSuggestionOpen(true);
            }

            const allFailed = results.every(r => r.status === 'rejected');
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const totalElapsed = Math.floor((Date.now() - batchStart) / 1000);

            if (allFailed) {
                onQuoteProcessed(null);
                setError('Todos los archivos fallaron. Revisa el debugger abajo 👇');
            } else {
                const seqEstimate = Object.values(fileTimings).reduce((a, b) => a + b, 0);
                setCompletionStats({
                    total: totalFiles,
                    success: successCount,
                    failed: totalFiles - successCount,
                    realTime: totalElapsed,
                    seqEstimate: seqEstimate || totalElapsed * totalFiles, // fallback
                    saving: Math.max(0, (seqEstimate || totalElapsed * totalFiles) - totalElapsed)
                });

                console.log("Resultados Finales:", finalQuoteRecord);
                setDebugData(combinedDebug);
                onQuoteProcessed(finalQuoteRecord ?? null);
                const failedIndices = new Set(results.map((r, i) => r.status === 'rejected' ? i : -1).filter(i => i >= 0));
                setFiles(prev => prev.filter((_, i) => failedIndices.has(i)));
            }

        } catch (err) {
            console.error('Error inesperado:', err);
            const serverError = err.response?.data || { error: err.message };
            setDebugData(serverError);
            setError('Hubo un error al procesar. Revisa el debugger abajo 👇');
        } finally {
            setLoading(false);
            setFileProgress({});
            setProcessingStart(null);
        }
    };

    const onDropRejected = useCallback((fileRejections) => {
        const rejectedFiles = fileRejections.map(r => r.file.name).join(', ');
        setToastMsg(`🚨 Tipo de archivo no permitido: ${rejectedFiles}. Solo se aceptan verdaderos archivos .pdf`);
        setToastOpen(true);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: true
    });

    return (
        <Box>
            <Box
                {...getRootProps()}
                sx={{
                    p: { xs: 4, md: 8 },
                    borderRadius: 4,
                    border: '2px dashed',
                    borderColor: isDragActive ? '#a855f7' : 'rgba(255,255,255,0.1)',
                    background: isDragActive ? 'rgba(168,85,247,0.05)' : 'rgba(15,23,42,0.4)',
                    backdropFilter: 'blur(10px)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    mb: 4,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:hover': {
                        borderColor: 'rgba(168,85,247,0.5)',
                        background: 'rgba(168,85,247,0.02)',
                        boxShadow: '0 0 30px rgba(168,85,247,0.1)'
                    }
                }}
            >
                <input {...getInputProps()} />
                <Box
                    sx={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(59,130,246,0.2) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3,
                        boxShadow: '0 0 20px rgba(168,85,247,0.4)',
                        border: '1px solid rgba(168,85,247,0.3)',
                    }}
                >
                    <CloudUploadIcon sx={{ fontSize: 40, color: '#c084fc', filter: 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.8))' }} />
                </Box>
                <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 800, mb: 1, letterSpacing: -0.5 }}>
                    {isDragActive ? 'SUELTA LOS ARCHIVOS AHORA' : 'Toca o Arrastra tus PDFs aquí'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                    Validación automática de duplicados por MD5
                </Typography>
            </Box>

            {files.length > 0 && (
                <TableContainer component={Box} className="glass-card" sx={{ mb: 4, overflow: 'hidden' }}>
                    <Table size="medium">
                        <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                            <TableRow>
                                <TableCell>Estado</TableCell>
                                <TableCell>Nombre del Archivo</TableCell>
                                <TableCell>Empresa Asignada</TableCell>
                                <TableCell align="right">Tamaño</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {files.map((fileObj, index) => {
                                const status = fileProgress[fileObj.md5] || 'pending';
                                const timeTaken = fileTimings[fileObj.md5];
                                const statusIcon = {
                                    pending: <Chip icon={<HourglassEmptyIcon />} label="En cola" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.07)', color: '#94a3b8' }} />,
                                    processing: <Chip icon={<CircularProgress size={12} />} label="Procesando..." size="small" color="info" />,
                                    done: <Chip icon={<CheckCircleIcon />} label={timeTaken ? `Listo (${timeTaken}s)` : 'Listo'} size="small" color="success" />,
                                    error: <Chip icon={<ErrorIcon />} label="Error" size="small" color="error" />,
                                }[status];

                                return (
                                    <TableRow key={fileObj.md5} sx={{
                                        opacity: status === 'done' ? 0.7 : 1,
                                        transition: 'opacity 0.4s'
                                    }}>
                                        <TableCell>{statusIcon}</TableCell>
                                        <TableCell component="th" scope="row">
                                            {fileObj.file.name}
                                        </TableCell>
                                        <TableCell>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Empresa</InputLabel>
                                                <Select
                                                    value={fileObj.companyId || ''}
                                                    label="Empresa"
                                                    onChange={(e) => handleCompanyChange(fileObj.md5, e.target.value)}
                                                    disabled={loading}
                                                >
                                                    <MenuItem value="" disabled><em>Seleccione Empresa</em></MenuItem>
                                                    {companies.map(c => (
                                                        <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell align="right">
                                            {(fileObj.file.size / 1024).toFixed(1)} KB
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton aria-label="preview" onClick={() => handlePreview(fileObj.file)} size="small" color="primary" sx={{ mr: 1 }} disabled={loading}>
                                                <VisibilityIcon />
                                            </IconButton>
                                            <IconButton aria-label="delete" onClick={() => handleDeleteClick(fileObj.md5)} size="small" color="error" disabled={loading}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {files.length > 0 && (
                <Button
                    variant="contained"
                    fullWidth
                    className="glow-border"
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
                    onClick={processFiles}
                    disabled={loading || files.some(f => !f.companyId)}
                    sx={{
                        py: 1.8,
                        borderRadius: 3,
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        '&:hover': {
                            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                            boxShadow: '0 6px 20px rgba(139, 92, 246, 0.6)'
                        },
                        '&.Mui-disabled': {
                            background: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.3)'
                        }
                    }}
                >
                    {loading
                        ? `Procesando ${files.length} archivo(s) en paralelo...`
                        : files.some(f => !f.companyId)
                            ? 'Selecciona Empresa para Continuar'
                            : files.length > 1
                                ? `⚡ Analizar ${files.length} Archivos en Paralelo`
                                : `Analizar ${files.length} Archivo`}
                </Button>
            )}

            {error && (
                <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                    {error}
                </Typography>
            )}

            <Snackbar
                open={toastOpen}
                autoHideDuration={4000}
                onClose={() => setToastOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setToastOpen(false)} severity="warning" sx={{ width: '100%' }}>
                    {toastMsg}
                </Alert>
            </Snackbar>

            {/* Dialogo de Sugerencia de Optimización */}
            <Dialog
                open={suggestionOpen}
                onClose={() => setSuggestionOpen(false)}
            >
                <DialogTitle>🚀 Optimización Detectada</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {suggestionData?.message}
                        <br /><br />
                        ¿Desea actualizar la configuración de <b>{suggestionData?.companyName}</b> para leer solo estas páginas en el futuro? Esto hará el proceso más rápido y económico.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSuggestionOpen(false)} color="secondary">
                        No, seguir leyendo todo
                    </Button>
                    <Button
                        onClick={() => {
                            if (suggestionData) {
                                api.put(`/empresas/${suggestionData.companyId}`, {
                                    paginas_procesamiento: suggestionData.suggestedPages
                                })
                                    .then(() => {
                                        setToastMsg(`✅ Configuración actualizada para ${suggestionData.companyName}`);
                                        setToastOpen(true);
                                        // Actualizar lista local de empresas para reflejar el cambio en futuros selects
                                        setCompanies(prev => prev.map(c => c.id === suggestionData.companyId ? { ...c, paginas_procesamiento: suggestionData.suggestedPages } : c));
                                    })
                                    .catch(err => {
                                        console.error("Error actualizando empresa:", err);
                                        setToastMsg("❌ Error al actualizar configuración.");
                                        setToastOpen(true);
                                    });
                            }
                            setSuggestionOpen(false);
                            setSuggestionData(null);
                        }}
                        color="primary"
                        variant="contained"
                        autoFocus
                    >
                        Sí, optimizar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialogo de Confirmación de Borrado de Archivo */}
            <Dialog
                open={deleteDialogOpen}
                onClose={cancelDelete}
                PaperProps={{
                    sx: {
                        background: 'linear-gradient(135deg, #1e1e2f 0%, #151520 100%)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#fff', fontWeight: 800 }}>Quitar Archivo</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: '#cbd5e1' }}>
                        ¿Estás seguro de que deseas quitar este PDF de la lista de procesamiento?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={cancelDelete} sx={{ color: '#94a3b8' }}>Cancelar</Button>
                    <Button onClick={confirmDelete} variant="contained" color="error" sx={{ borderRadius: 2, fontWeight: 700 }}>
                        Sí, Quitar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Banner de resumen de procesamiento */}
            {completionStats && (
                <Box sx={{
                    mt: 3, p: 2.5, borderRadius: 3,
                    background: completionStats.failed > 0
                        ? 'linear-gradient(135deg, rgba(234,179,8,0.1), rgba(239,68,68,0.1))'
                        : 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.1))',
                    border: `1px solid ${completionStats.failed > 0 ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: completionStats.failed > 0 ? '#fbbf24' : '#4ade80' }}>
                            {completionStats.failed > 0
                                ? `⚠️ ${completionStats.success} de ${completionStats.total} archivos procesados`
                                : `✅ ${completionStats.total} archivos procesados`}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                            Tiempo real: <b style={{ color: '#fff' }}>{completionStats.realTime}s</b>
                            {completionStats.seqEstimate > completionStats.realTime && (
                                <>  •  Modo secuencial: <b style={{ color: '#94a3b8' }}>~{completionStats.seqEstimate}s</b></>)}
                        </Typography>
                    </Box>
                    {completionStats.saving > 2 && (
                        <Box sx={{
                            px: 2.5, py: 1, borderRadius: 99,
                            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                            boxShadow: '0 4px 15px rgba(139,92,246,0.4)'
                        }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
                                ⚡ {completionStats.saving}s ahorrados
                            </Typography>
                        </Box>
                    )}
                    <Button size="small" onClick={() => setCompletionStats(null)} sx={{ color: '#475569', minWidth: 'auto', p: 0.5 }}>✕</Button>
                </Box>
            )}

            {/* Debugger Section */}
            {showDebug && debugData && (
                <Box sx={{ mt: 4, p: 2, bgcolor: '#1e1e1e', borderRadius: 2, border: '1px solid #333' }}>
                    <Typography variant="subtitle2" sx={{ color: '#aaa', mb: 1, fontFamily: 'monospace' }}>
                        🐞 DEBUGGER: Respuesta Raw del Servidor
                    </Typography>
                    <Box sx={{
                        maxHeight: '300px',
                        overflow: 'auto',
                        bgcolor: '#000',
                        p: 2,
                        borderRadius: 1,
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        color: debugData.error ? '#ff5555' : '#0f0'
                    }}>
                        <pre>{JSON.stringify(debugData, null, 2)}</pre>
                    </Box>
                </Box>
            )}
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: 'column', gap: 2 }}
                open={loading}
            >
                <CircularProgress color="inherit" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {files.length > 1
                        ? `⚡ Procesando ${files.length} archivos en paralelo...`
                        : 'Procesando documento con IA...'}
                </Typography>

                {/* Contador progresivo */}
                {files.length > 1 && (
                    <Box sx={{ width: 340, textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)' }}>
                            {completedCount} de {files.length} archivos completados
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={(completedCount / files.length) * 100}
                            sx={{
                                height: 6, borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.15)',
                                '& .MuiLinearProgress-bar': {
                                    background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
                                    borderRadius: 3
                                }
                            }}
                        />
                    </Box>
                )}

                {/* Cronometro */}
                <Typography variant="body2" sx={{ opacity: 0.6, fontFamily: 'monospace', fontSize: '1rem' }}>
                    ⏱ {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:{String(elapsedSeconds % 60).padStart(2, '0')}
                </Typography>
            </Backdrop>
        </Box >
    );
};

export default FileUpload;
