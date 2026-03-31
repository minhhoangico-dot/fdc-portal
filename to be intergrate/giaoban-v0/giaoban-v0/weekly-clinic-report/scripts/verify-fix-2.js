
const http = require('http');

const endpoints = [
    'http://localhost:9000/api/report/current',
    'http://localhost:9000/api/services/categories',
    'http://localhost:9000/api/report/details?key=xn_bhyt&start=2024-01-01&end=2024-01-07' // Test detail API
];

async function checkUrl(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`[${res.statusCode}] ${url}`);
                if (res.statusCode === 200 && url.includes('report/current')) {
                    if (data.includes('Khám Nhi chung (dịch vụ, gói...)')) {
                        console.log('✅ Found new category name in report.');
                    } else {
                        console.log('❌ New category name NOT found in report.');
                    }
                }
                if (res.statusCode !== 200) {
                    // console.log('Error Body:', data.substring(0, 200));
                }
                resolve(res.statusCode === 200);
            });
        }).on('error', (err) => {
            console.error(`[FAILED] ${url} - ${err.message}`);
            resolve(false);
        });
    });
}

(async () => {
    console.log('Starting Verification...');
    // Wait a bit for dev server to recover from syntax error
    await new Promise(r => setTimeout(r, 2000));
    const results = await Promise.all(endpoints.map(checkUrl));
    if (results.every(r => r)) {
        console.log('✅ All endpoints are reachable and returning 200 OK.');
    } else {
        console.log('❌ Some endpoints failed.');
        process.exit(1);
    }
})();
