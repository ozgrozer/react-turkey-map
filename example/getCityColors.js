const colorBands = [
  { threshold: 10000000, color: '#071E58' }, // Over 10.000.000
  { threshold: 3000000, color: '#253494' }, // 3.000.000 - 10.000.000
  { threshold: 2000000, color: '#225EA8' }, // 2.000.000 - 3.000.000
  { threshold: 1000000, color: '#1E91C0' }, // 1.000.000 - 2.000.000
  { threshold: 500000, color: '#30A4C2' }, // 500.000 - 1.000.000
  { threshold: 250000, color: '#41B6C4' }, // 250.000 - 500.000
  { threshold: 0, color: '#85cfd8' } // Under 250.000
]

const getColorForPopulation = population => {
  for (const band of colorBands) {
    if (population >= band.threshold) {
      return band.color
    }
  }
}

export default (cities) => {
  const cityColors = {}
  for (const [plate, populationStr] of Object.entries(cities)) {
    const population = parseInt(populationStr.replace(/\./g, ''))
    const color = getColorForPopulation(population)
    cityColors[plate] = color
  }
  return cityColors
}
