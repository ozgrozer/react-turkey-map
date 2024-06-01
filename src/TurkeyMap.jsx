/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import React, { useState } from 'react'

import cities from './cities'

const styles = {
  turkeyMapWrapper: css`
    margin: 0 auto;
    max-width: 1140px;
    text-align: center;
  `,
  turkeyMap: css`
    width: 100%;
    height: auto;
  `,
  path: css`
    fill: #bbb;
    cursor: pointer;
    &:hover {
      fill: #aaa;
    }
  `,
  tooltipCss: css`
    z-index: 2;
    position: absolute;
  `,
  tooltipContent: css`
    color: #fff;
    font-size: 14px;
    background: #000;
    padding: 8px 16px;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  `
}

export default ({ colorData: _colorData }) => {
  const colorData = _colorData || {}

  const [tooltip, setTooltip] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const handleMouseOver = (event) => {
    if (event.target.tagName === 'path') {
      const city = event.target.parentNode.getAttribute('data-city')
      setTooltip((<div css={styles.tooltipContent}>{city}</div>))
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
          onMouseOut={handleMouseOut}
          onMouseOver={handleMouseOver}
          onMouseMove={handleMouseMove}
          viewBox='0 0 1007.478 527.323'
          xmlns='http://www.w3.org/2000/svg'
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
