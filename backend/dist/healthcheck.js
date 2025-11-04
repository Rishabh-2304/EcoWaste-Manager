"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const healthCheck = () => {
    const options = {
        hostname: 'localhost',
        port: process.env.PORT || 3001,
        path: '/health',
        method: 'GET',
        timeout: 2000
    };
    const request = http_1.default.request(options, (response) => {
        console.log(`Health check status: ${response.statusCode}`);
        if (response.statusCode === 200) {
            process.exit(0);
        }
        else {
            process.exit(1);
        }
    });
    request.on('error', (err) => {
        console.log('Health check failed:', err);
        process.exit(1);
    });
    request.on('timeout', () => {
        console.log('Health check timeout');
        request.abort();
        process.exit(1);
    });
    request.end();
};
healthCheck();
