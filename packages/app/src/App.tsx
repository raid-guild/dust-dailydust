import { Analytics } from "@vercel/analytics/next";
import { BrowserRouter as Router } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import AppRoutes from "@/Routes";

export default function App() {
  return (
    <Router>
      <Layout>
        <Toaster />
        <Analytics />
        <AppRoutes />
      </Layout>
    </Router>
  );
}
