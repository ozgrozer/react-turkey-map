import { createRoot } from 'react-dom/client'

import TurkeyMap from './../build/TurkeyMap'
// import TurkeyMap from './../src/TurkeyMap'

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
