// Quick sanity test for costCalculator (run: node --experimental-strip-types scripts/test-cost-calculator.mts)
import { calculateCost, machineRatePerHour, formatMoney, defaultCostSettings } from '../src/lib/costCalculator.ts'

const settings = defaultCostSettings({
  kwhPrice: 120.5,       // ARS/kWh
  laborRatePerHour: 800, // ARS/hora
  targetMarginPercent: 60,
  failRatePercent: 10,
  overheadPerJob: 500,
})

const printer = { purchasePrice: 1500000, expectedLifetimeHours: 12000, powerWatts: 250 }

const c = calculateCost({
  filamentGrams: 250,
  materialPricePerKg: 40000, // ARS/kg (ej: un kg de PLA caro)
  printHours: 12,
  laborHours: 14, // 12 de monitoreo + 2 de post-procesado
  consumablesCost: 800,
  printer,
  settings,
})

console.log('=== Desglose ARS ===')
for (const [k, v] of Object.entries(c)) {
  if (typeof v === 'number') console.log(`${k}: ${formatMoney(v, 'ARS')}`)
}

// Assertions
const assert = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`)
  if (!cond) process.exitCode = 1
}

// Verificación manual del cálculo
const material = (250 / 1000) * 40000
const energy = (250 / 1000) * 120.5 * 12
const deprec = (1500000 / 12000) * 12
const labor = 14 * 800
const subtotal = material + energy + deprec + labor + 800 + 500
const fail = subtotal * 0.1
const total = subtotal + fail
const sale = total / (1 - 0.6)

assert('Material correcto', Math.abs(c.material - material) < 0.01)
assert('Energía correcta', Math.abs(c.machineEnergy - energy) < 0.01)
assert('Depreciación correcta', Math.abs(c.machineDepreciation - deprec) < 0.01)
assert('Labor correcta', Math.abs(c.labor - labor) < 0.01)
assert('Subtotal correcto', Math.abs(c.subtotal - subtotal) < 0.01)
assert('Buffer fallo correcto', Math.abs(c.failBuffer - fail) < 0.01)
assert('Costo total correcto', Math.abs(c.totalCost - total) < 0.01)
assert('Precio sugerido correcto', Math.abs(c.suggestedPrice - sale) < 0.01)
assert('Margen real = objetivo (60%)', Math.abs(c.marginPercent - 60) < 0.01)
assert('Margen correcto', Math.abs(c.profitAmount - (sale - total)) < 0.01)

console.log('\n=== Formato moneda ===')
console.log('ARS 1234567:', formatMoney(1234567, 'ARS'))
console.log('USD 1234.56:', formatMoney(1234.56, 'USD'))
assert('Formato ARS sin decimales', !formatMoney(100, 'ARS').includes('100,00'))
assert('Formato USD con decimales', formatMoney(100, 'USD').includes('100,00'))

console.log('\n=== Tarifa máquina por hora ===')
const rate = machineRatePerHour(printer, 120.5)
console.log('Tarifa máquina/hora:', formatMoney(rate, 'ARS'))
assert('Tarifa máquina/hora correcta', Math.abs(rate - (1500000 / 12000 + 0.25 * 120.5)) < 0.01)

// Sin impresora (los costos de máquina deben ser 0)
const noPrinter = calculateCost({ filamentGrams: 100, materialPricePerKg: 1000, printHours: 2, settings })
assert('Sin impresora, energía=0', noPrinter.machineEnergy === 0)
assert('Sin impresora, depreciación=0', noPrinter.machineDepreciation === 0)

console.log('\nResultado:', process.exitCode ? 'FAIL' : 'PASS')
