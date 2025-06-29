import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Inscription from "./components/Inscription";
import Login from "./components/Login";
import Page from "./components/Page";
import PrivateRoute from "./components/PrivateRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route
          path="/page"
          element={
            <PrivateRoute>
              <Page />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}
