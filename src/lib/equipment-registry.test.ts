import {describe,it,expect} from 'vitest'
import {EQUIPMENT_REGISTRY,screenEquipment} from './equipment-registry'
describe('SQ-04C evidence gates',()=>{
 it('never confuses a manufacturer source with Chilean SEC authorization',()=>{
  const inverter=EQUIPMENT_REGISTRY[0]
  const result=screenEquipment(inverter)
  expect(result.status).toBe('insufficient-data')
  expect(result.checks.find(x=>x.code==='SOURCE')?.passed).toBe(true)
  expect(result.checks.find(x=>x.code==='SEC')?.passed).toBeNull()
  expect(result.checks.find(x=>x.code==='AFCI')?.passed).toBeNull()
  expect(result.checks.find(x=>x.code==='PRICE')?.passed).toBeNull()
 })
 it('rejects presenting a placeholder battery as a verified product',()=>{
  const r=screenEquipment(EQUIPMENT_REGISTRY[1])
  expect(r.checks.find(x=>x.code==='SOURCE')?.passed).toBeNull()
  expect(r.status).toBe('insufficient-data')
 })
 it('never auto-approves engineering even if evidence fields are supplied',()=>{
  const r=screenEquipment({...EQUIPMENT_REGISTRY[0],secStatus:'authorized',afciStatus:'integrated',priceClpNet:300000,priceObservedOn:'2026-10-20'})
  expect(r.status).toBe('insufficient-data')
  expect(r.checks.find(x=>x.code==='ELECTRICAL')?.passed).toBeNull()
 })
})
