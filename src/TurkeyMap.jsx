/** @jsxImportSource @emotion/react */
import React, { useState } from 'react'

import cities from './cities'
import styles from './styles'

export default ({ colorData: _colorData, showTooltip: _showTooltip, tooltipData: _tooltipData }) => {
  const colorData = _colorData || {}
  const showTooltip = _showTooltip !== undefined ? _showTooltip : true
  const tooltipData = _tooltipData || {}

  const [tooltip, setTooltip] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const handleMouseOver = event => {
    if (event.target.tagName === 'path') {
      const city = event.target.parentNode.getAttribute('data-city')
      const plate = event.target.parentNode.getAttribute('data-plate')
      const TooltipComponent = (
        <div css={styles.tooltipContent}>
          {city}{tooltipData[plate] ? `: ${tooltipData[plate]}` : ''}
        </div>
      )
      setTooltip(TooltipComponent)
    }
  }

  const handleMouseMove = event => {
    setPosition({ top: event.pageY + 25, left: event.pageX })
  }

  const handleMouseOut = () => {
    setTooltip('')
  }

  const handleClick = event => {
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
        css={styles.tooltipCss}
        style={{ top: position.top, left: position.left }}
      >
        {tooltip}
      </div>

      <div css={styles.turkeyMapWrapper}>
        <svg
          version='1.1'
          onClick={handleClick}
          css={styles.turkeyMap}
          viewBox='0 0 1007.478 527.323'
          xmlns='http://www.w3.org/2000/svg'
          {...(showTooltip ? { onMouseOut: handleMouseOut } : {})}
          {...(showTooltip ? { onMouseOver: handleMouseOver } : {})}
          {...(showTooltip ? { onMouseMove: handleMouseMove } : {})}
        >
          <g>
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
                            css={styles.path}
                            style={{ fill: colorData[city.plate] }}
                          />
                          )
                        : (
                          <path
                            d={city.draw}
                            css={styles.path}
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
