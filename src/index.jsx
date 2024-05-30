import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'

import cities from './cities'
import style from './style.module.scss'

const App = () => {
  const [tooltip, setTooltip] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const handleMouseOver = (event) => {
    if (event.target.tagName === 'path') {
      const name = event.target.parentNode.getAttribute('data-name')
      setTooltip((<div>{name}</div>))
    }
  }

  const handleMouseMove = (event) => {
    setPosition({ top: event.pageY + 25, left: event.pageX })
  }

  const handleMouseOut = () => {
    setTooltip('')
  }

  const handleClick = (event) => {
    if (event.target.tagName === 'path') {
      const parent = event.target.parentNode
      const name = parent.getAttribute('data-name')
      const plate = parent.getAttribute('data-plate')
      console.log({ name, plate })
    }
  }

  return (
    <div>
      <div
        className={style.tooltip}
        style={{ top: position.top, left: position.left }}
      >
        {tooltip}
      </div>

      <div className={style.turkeyMapWrapper}>
        <svg
          version='1.1'
          onClick={handleClick}
          className={style.turkeyMap}
          onMouseOut={handleMouseOut}
          onMouseOver={handleMouseOver}
          onMouseMove={handleMouseMove}
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
    </div>
  )
}

createRoot(document.getElementById('app'))
  .render(<App />)
