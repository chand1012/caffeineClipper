import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import {
  MantineProvider,
  ColorSchemeProvider,
  ColorScheme,
} from "@mantine/core";
import App from "./App";
import "./style.css";

// use this to generate color schemes: https://smart-swatch.netlify.app

function CompleteApp() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("dark");
  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"));

  return (
    <ColorSchemeProvider
      colorScheme={colorScheme}
      toggleColorScheme={toggleColorScheme}
    >
      <MantineProvider
        theme={{
          colorScheme,
          primaryColor: "purple",
          colors: {
            purple: [
              "#f2e3ff",
              "#d3b2ff",
              "#b380ff",
              "#954dff",
              "#771bfe",
              "#5d02e5",
              "#5d02e5",
              "#5d02e5",
              "#4800b3",
              "#340081",
            ],
          },
        }}
        withGlobalStyles
        withNormalizeCSS
      >
        <App />
      </MantineProvider>
    </ColorSchemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <CompleteApp />
  </React.StrictMode>
);
