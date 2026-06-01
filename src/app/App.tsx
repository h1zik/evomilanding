import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { ContentProvider } from "../content/ContentContext";
import { EvomiLanding } from "./components/EvomiLanding";
import { AdminLogin } from "./admin/AdminLogin";
import { AdminPanel } from "./admin/AdminPanel";

export default function App() {
  return (
    <ContentProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EvomiLanding />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/panel" element={<AdminPanel />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </ContentProvider>
  );
}
