import { BrowserRouter, Routes, Route } from "react-router-dom";
import Hero from "./pages/Hero";
import Dashboard from "./pages/Dashboard";
import BorrowerDetail from "./pages/BorrowerDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/borrowers/:id" element={<BorrowerDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
