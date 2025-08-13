import { BrowserRouter as Router } from "react-router-dom";

import { Layout } from "./components/Layout";
import AppRoutes from "./Routes";

export default function App() {
  return (
    <Router>
      <Layout>
        <AppRoutes />
      </Layout>
    </Router>
  );
}
