import { createRoot } from 'react-dom/client'

// development
import TurkeyMap from './../src/TurkeyMap'

// build test
// import TurkeyMap from './../build/TurkeyMap'

// npm test
// import TurkeyMap from 'react-turkey-map'

const App = () => {
  const colorData = {
    '07': 'red',
    '06': 'green'
  }

  return (
    <TurkeyMap
      colorData={colorData}
    />
  )
}

createRoot(document.getElementById('app'))
  .render(<App />)
