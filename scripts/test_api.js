const http = require('http');

function get(path) {
    return new Promise((resolve, reject) => {
        http.get({
            hostname: 'localhost',
            port: 3000,
            path: path,
            headers: { 'Accept': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
        }).on('error', reject);
    });
}

async function test() {
    try {
        console.log("Testing /api/auth/status...");
        const auth = await get('/api/auth/status');
        console.log(`Status: ${auth.statusCode}, Body: ${auth.body.substring(0, 100)}`);

        console.log("\nTesting /api/config (expecting 401 if unauthorized, NOT 404)...");
        const config = await get('/api/config');
        console.log(`Status: ${config.statusCode}, Body: ${config.body.substring(0, 100)}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
