import { Layout } from "./components/Layout";
import { BrowserRouter as Router } from "react-router-dom";
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
