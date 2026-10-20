import {defineConfig,devices} from '@playwright/test'

export default defineConfig({
  testDir:'./e2e',
  timeout:60000,
  expect:{timeout:10000},
  retries:process.env.CI?1:0,
  reporter:process.env.CI?[['line'],['html',{open:'never',outputFolder:'playwright-report'}]]:'list',
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure'},
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome'],acceptDownloads:true}},
    {name:'android-chromium',use:{...devices['Pixel 7'],browserName:'chromium',acceptDownloads:true}},
  ],
  webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI,timeout:120000},
})
