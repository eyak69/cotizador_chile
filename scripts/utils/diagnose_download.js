const axios = require('axios');
const fs = require('fs');

async function testDownload() {
    try {
        console.log("Testeando descarga de Word para ID 133...");
        const url = 'http://localhost:3000/api/quotes/133/word';

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer', // Importante para ficheros binarios
            validateStatus: false // Para capturar errores 500/404
        });

        console.log(`Status Code: ${response.status}`);
        console.log('Headers:', response.headers);

        if (response.status === 200) {
            console.log("Descarga exitosa. Guardando preview...");
            fs.writeFileSync('debug_download_133.docx', response.data);
            console.log("Guardado en debug_download_133.docx");
        } else {
            console.error("Error en la descarga. Body preview:");
            console.log(response.data.toString());
        }

    } catch (error) {
        console.error("Error de conexión:", error.message);
    }
}

testDownload();
