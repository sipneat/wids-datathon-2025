import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Example from "./pages/Example";

export default function App() {
  return (
    <div className="bg-gray-800">
      <Router>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/example" element={<Example />} />
        </Routes>
      </Router>
    </div>
  );
}
