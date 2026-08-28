/*
 * Downloads and caches the Natural Earth source used by index.js and verify.js.
 *
 * Source: Natural Earth 10m admin-1 states/provinces
 *   https://github.com/nvkelso/natural-earth-vector
 *   geojson/ne_10m_admin_1_states_provinces.geojson (~40MB)
 * License: public domain (Natural Earth terms of use)
 */

const fs = require('fs')
const path = require('path')

const sourceUrl =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'

const cacheDir = path.join(__dirname, '.cache')
const cacheFile = path.join(cacheDir, 'ne_10m_admin_1_states_provinces.geojson')

const readArg = name => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const downloadSource = async () => {
  fs.mkdirSync(cacheDir, { recursive: true })
  process.stdout.write(`Downloading ${sourceUrl}\n`)
  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`)
  }
  fs.writeFileSync(cacheFile, Buffer.from(await response.arrayBuffer()))
  return cacheFile
}

const getSourceFile = async () => {
  const input = readArg('--input')
  if (input) return input
  if (fs.existsSync(cacheFile)) return cacheFile
  return downloadSource()
}

// the 81 Turkish provinces, sorted by plate number
const readTurkeyFeatures = async () => {
  const sourceFile = await getSourceFile()
  process.stdout.write(`Reading ${sourceFile}\n`)
  const geojson = JSON.parse(fs.readFileSync(sourceFile, 'utf8'))
  return geojson.features
    .filter(feature => feature.properties.adm0_a3 === 'TUR')
    .map(feature => ({
      ...feature,
      plate: String(feature.properties.iso_3166_2)
        .replace(/^TR-/, '')
        .padStart(2, '0')
    }))
    .sort((a, b) => a.plate.localeCompare(b.plate))
}

module.exports = {
  sourceUrl,
  cacheDir,
  readArg,
  getSourceFile,
  readTurkeyFeatures
}
