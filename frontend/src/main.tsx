import { ApolloProvider } from "@apollo/client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppThemeProvider } from "./AppThemeProvider";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import client from "./graphql/client";
import "./i18n";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <AuthProvider>
        <AppThemeProvider>
          <App />
        </AppThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  </StrictMode>
);
