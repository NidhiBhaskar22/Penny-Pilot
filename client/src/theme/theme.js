import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {
    primary: {
      500: "#F5A623", // Orange
      600: "#E3931A",
      700: "#C77D15",
    },
    black: {
      500: "#1A2328",
    },
    green: {
      500: "#43B349",
      600: "#2C8C34",
    },
    background: {
      50: "#F5F3EF",
      100: "#E4E4E2",
    },
    teal: {
      500: "#318281",
    },
    gray: {
      100: "#E4E4E2",
      500: "#929292",
    },
  },
  styles: {
    global: {
      body: {
        bg: "#F5F3EF",
        color: "#1A2328",
      },
    },
  },
  fonts: {
    heading: "Montserrat, Arial, sans-serif",
    body: "Inter, Arial, sans-serif",
  },
});

export default theme;
