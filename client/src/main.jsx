import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import NotificationProvider from "./components/notificationProvider";
import { AuthProvider } from "./context/authContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NotificationProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </NotificationProvider>
  </React.StrictMode>,
);
