import React, { useState } from 'react'

import cities from './cities'
import styles from './styles'

export default ({ colorData: _colorData }) => {
  const colorData = _colorData || {}

  const [tooltip, setTooltip] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const handleMouseOver = (event) => {
    if (event.target.tagName === 'path') {
      const city = event.target.parentNode.getAttribute('data-city')
      setTooltip((<div style={styles.tooltipContent}>{city}</div>))
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
      <div style={{ ...styles.tooltip, top: position.top, left: position.left }}>
        {tooltip}
      </div>

      <div style={styles.turkeyMapWrapper}>
        <svg
          version='1.1'
          onClick={handleClick}
          onMouseOut={handleMouseOut}
          style={styles.turkeyMap}
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
                        ? (
                          <path
                            d={city.draw}
                            style={{ ...styles.path, fill: colorData[city.plate] }}
                          />
                          )
                        : (
                          <path
                            d={city.draw}
                            style={styles.path}
                          />
                          )
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
