const colorBands = [
  { threshold: 10000000, color: '#0B3D91' }, // Over 10.000.000
  { threshold: 3000000, color: '#1E5AA6' }, // 3.000.000 - 10.000.000
  { threshold: 2000000, color: '#2978B5' }, // 2.000.000 - 3.000.000
  { threshold: 1000000, color: '#3490C7' }, // 1.000.000 - 2.000.000
  { threshold: 500000, color: '#52A1CF' }, // 500.000 - 1.000.000
  { threshold: 250000, color: '#73B9D9' }, // 250.000 - 500.000
  { threshold: 0, color: '#85CFD8' } // Under 250.000
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
