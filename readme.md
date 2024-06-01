# react-turkey-map

Customizable Turkey map

[![npm](https://img.shields.io/npm/v/react-turkey-map.svg?style=flat-square)](https://www.npmjs.com/package/react-turkey-map)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ozgrozer/react-turkey-map/blob/main/license)

## Demo

[PlayCode](https://playcode.io/1891552) - [StackBlitz](https://stackblitz.com/edit/react-turkey-map?file=src%2FApp.jsx) - [CodeSandbox](https://codesandbox.io/p/sandbox/react-turkey-map-kwxylt?file=%2Fsrc%2FApp.jsx) - [Vercel (Next.js)](https://next-turkey-map.vercel.app) - [CodePen (UMD)](https://codepen.io/ozgrozer/pen/JjqWEbe?editors=1000) - [JSFiddle (UMD)](https://jsfiddle.net/ozgrozer/314nLwa2/)

## Installation

Install with NPM

```sh
npm install react-turkey-map
```

## Usage

```jsx
import TurkeyMap from 'react-turkey-map'

export default () => {
  return (
    <TurkeyMap />
  )
}
```

## Props

```jsx
<TurkeyMap
  showTooltip
  colorData={{}}
  tooltipData={{}}
/>

// types and defaults
showTooltip: bool (default: true)
colorData: object (default: {})
tooltipData: object (default: {})

// colorData prop
// plate: city color
colorData={{
  '34': '#071E58',
  '06': '#253494',
  '35': '#253494',
  '16': '#253494',
  '07': '#225EA8'
}}

// tooltipData prop
// plate: city tooltip
tooltipData={{
  '34': '15.655.924',
  '06': '5.803.482',
  '35': '4.479.525',
  '16': '3.214.571',
  '07': '2.696.249'
}}
```

## Contribution

Feel free to contribute. Open a new [issue](https://github.com/ozgrozer/react-turkey-map/issues), or make a [pull request](https://github.com/ozgrozer/react-turkey-map/pulls).

## License

[MIT](https://github.com/ozgrozer/react-turkey-map/blob/main/license)
