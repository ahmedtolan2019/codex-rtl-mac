import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests',testMatch:'*.spec.mjs',use:{baseURL:'http://127.0.0.1:8767',viewport:{width:1280,height:900}},webServer:{command:'node tests/server.mjs',url:'http://127.0.0.1:8767/docs/demo.html',reuseExistingServer:!process.env.CI},reporter:'list'});
