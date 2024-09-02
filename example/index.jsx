/** @jsxImportSource @emotion/react */
import { useState } from "react";
import { createRoot } from "react-dom/client";

import styles from "./styles";
import Buttons from "./Buttons";
import MapComponent from "./MapComponent";

const App = () => {
  const [colorData, setColorData] = useState({});
  const [tooltipData, setTooltipData] = useState({});

  const handleOnClick = (city, plate) => {
    console.log(`City: ${city}, Plate: ${plate}`);
  };

  return (
    <div css={styles.wrapper}>
      <Buttons setColorData={setColorData} setTooltipData={setTooltipData} />

      <MapComponent
        colorData={colorData}
        tooltipData={tooltipData}
        onClick={handleOnClick}
      />
    </div>
  );
};

createRoot(document.getElementById("app")).render(<App />);
