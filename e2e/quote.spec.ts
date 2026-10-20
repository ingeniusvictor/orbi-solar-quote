import {test,expect} from '@playwright/test'
import {readFileSync,mkdirSync} from 'node:fs'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'

test('selects manufacturer-backed module, recalculates quote and downloads valid DEMO PDF',async({page},testInfo)=>{
  await page.goto('/')
  await expect(page.getByRole('heading',{name:/Tu techo tiene potencial/})).toBeVisible()
  await page.getByRole('button',{name:'Continuar'}).click()
  await page.getByRole('radio',{name:'Vertex S+ TSM-450 NEG9R.28'}).check()
  await expect(page.getByText('450 Wp · Datos de fabricante')).toBeVisible()
  await expect(page.getByText('SEC: autorización NO verificada.')).toBeVisible()
  await page.getByRole('button',{name:/Calcular mi potencial/}).click()
  await expect(page.getByText(/módulos de 450 Wp considerados/)).toBeVisible()
  const quote=page.getByRole('region',{name:'Presupuesto demostrativo de sistema solar'})
  await expect(quote).toBeVisible()
  await expect(quote.getByText(/TODOS LOS PRECIOS SON FICTICIOS/)).toBeVisible()
  const moduleUnit=quote.getByRole('spinbutton',{name:/Precio unitario neto Módulo fotovoltaico genérico/})
  await moduleUnit.fill('155000')
  await moduleUnit.blur()
  await expect(moduleUnit).toHaveValue('155000')
  const artifact=join(testInfo.outputDir,'orbi-quote-DEMO.pdf')
  mkdirSync(testInfo.outputDir,{recursive:true})
  const [download]=await Promise.all([
    page.waitForEvent('download',{timeout:20000}),
    quote.getByRole('button',{name:/Descargar PDF de demostración/}).click(),
  ])
  expect(download.suggestedFilename()).toContain('DEMO.pdf')
  await download.saveAs(artifact)
  const bytes=readFileSync(artifact)
  expect(bytes.subarray(0,5).toString()).toBe('%PDF-')
  expect(bytes.length).toBeGreaterThan(2000)
  const pdfText=execFileSync('pdftotext',['-layout',artifact,'-'],{encoding:'utf8'})
  expect(pdfText).toContain('PRESUPUESTO DEMOSTRATIVO')
  expect(pdfText).toContain('Trina Solar')
  expect(pdfText).toContain('NO ES COTIZACION')
  const info=execFileSync('pdfinfo',[artifact],{encoding:'utf8'})
  expect(info).toMatch(/Pages:\s+[1-9]/)
  const png=join(testInfo.outputDir,'orbi-result.png')
  await page.screenshot({path:png,fullPage:true,animations:'disabled'})
  await testInfo.attach('PDF-de-demostracion',{path:artifact,contentType:'application/pdf'})
  await testInfo.attach('captura-de-resultados',{path:png,contentType:'image/png'})
})
