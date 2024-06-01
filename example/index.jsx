import { createRoot } from 'react-dom/client'

import BasicMap from './BasicMap'

const App = () => {
  return (
    <div>
      <BasicMap />
    </div>
  )
}

createRoot(document.getElementById('app'))
  .render(<App />)
