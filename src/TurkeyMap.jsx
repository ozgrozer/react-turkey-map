import React, { useState } from 'react'

import './style.scss'
import cities from './cities'

export default ({ colorData }) => {
  const [tooltip, setTooltip] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const handleMouseOver = (event) => {
    if (event.target.tagName === 'path') {
      const city = event.target.parentNode.getAttribute('data-city')
      setTooltip((<div>{city}</div>))
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
      const city = parent.getAttribute('data-city')
      const plate = parent.getAttribute('data-plate')
      console.log({ city, plate })
    }
  }

  return (
    <div>
      <div
        className='tooltip'
        style={{ top: position.top, left: position.left }}
      >
        {tooltip}
      </div>

      <div className='turkeyMapWrapper'>
        <svg
          version='1.1'
          className='turkeyMap'
          onClick={handleClick}
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
                    data-city={city.city}
                    data-plate={city.plate}
                  >
                    {
                      colorData[city.plate]
                        ? <path d={city.draw} style={{ fill: colorData[city.plate] }} />
                        : <path d={city.draw} />
                    }
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
