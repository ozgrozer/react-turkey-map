import { createRoot } from 'react-dom/client'

import TurkeyMap from './../src/TurkeyMap'

const App = () => {
  return (
    <TurkeyMap />
  )
}

createRoot(document.getElementById('app'))
  .render(<App />)
