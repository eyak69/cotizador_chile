require('dotenv').config();
const { sequelize } = require('../database');
const http = require('http');

async function checkHealth() {
    console.log('--- SYSTEM HEALTH CHECK ---');
    let dbStatus = false;
    let serverStatus = false;

    // 1. Check DB Connection
    try {
        await sequelize.authenticate();
        console.log('✅ DATABASE: Connection successful.');
        dbStatus = true;
    } catch (error) {
        console.error('❌ DATABASE: Connection failed:', error.message);
    }

    // 2. Check Server API (Port 3000)
    // Usamos http.get nativo para no depender de axios en scripts
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/config', // Endpoint ligero
        method: 'GET',
        timeout: 2000
    };

    const req = http.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
            console.log(`✅ SERVER: API responding (Status ${res.statusCode}).`);
            serverStatus = true;
        } else {
            console.error(`❌ SERVER: API returned error status ${res.statusCode}.`);
        }
        printSummary(dbStatus, serverStatus);
    });

    req.on('error', (e) => {
        console.error(`❌ SERVER: Request failed (${e.message}). Server might be down.`);
        printSummary(dbStatus, serverStatus);
    });

    req.on('timeout', () => {
        req.destroy();
        console.error('❌ SERVER: Request timed out.');
        printSummary(dbStatus, serverStatus);
    });

    req.end();
}

function printSummary(db, server) {
    console.log('\n--- SUMMARY ---');
    if (db && server) {
        console.log('🎉 SYSTEM IS HEALTHY');
        process.exit(0);
    } else {
        console.log('⚠️ SYSTEM HAS ISSUES');
        process.exit(1);
    }
}

checkHealth();
