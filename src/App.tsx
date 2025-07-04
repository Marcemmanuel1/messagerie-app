import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Inscription from "./components/Inscription";
import Login from "./components/Login";
import Page from "./components/Page";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/" element={<Login />} />
        <Route
          path="/page"
          element={
              <Page />
          }
        />
      </Routes>
    </Router>
  );
}
