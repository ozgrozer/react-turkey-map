import { createRoot } from 'react-dom/client'

import cities from './cities'

const App = () => {
  return (
    <div>
      <svg
        version='1.1'
        id='svg-turkiye-haritasi'
        viewBox='0 0 1007.478 527.323'
        xmlns='http://www.w3.org/2000/svg'
      >
        <g id='turkiye'>
          {
            cities.map((city, key) => {
              return (
                <g
                  key={key}
                  id={city.plate}
                  data-name={city.name}
                  data-plate={city.plate}
                >
                  <path d={city.draw} />
                </g>
              )
            })
          }
        </g>
      </svg>
    </div>
  )
}

createRoot(document.getElementById('app'))
  .render(<App />)
