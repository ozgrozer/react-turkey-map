import { createRoot } from 'react-dom/client'

import './../build/style.css'
import TurkeyMap from './../build/TurkeyMap'
// import TurkeyMap from './../src/TurkeyMap'

const App = () => {
  return (
    <TurkeyMap />
  )
}

createRoot(document.getElementById('app'))
  .render(<App />)
