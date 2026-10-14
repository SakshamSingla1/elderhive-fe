import { Route, Routes } from 'react-router-dom';
import LoginPage from './components/pages/Authentication/Login.page';
import AdminLoginPage from './components/pages/Authentication/AdminLogin.page';
import SuperAdminLoginPage from './components/pages/Authentication/SuperAdminLogin.page';
import ElderLoginPage from './components/pages/Authentication/ElderLogin.page';
import CaretakerLoginPage from './components/pages/Authentication/CaretakerLogin.page';
import FamilyLoginPage from './components/pages/Authentication/FamilyLogin.page';

// "/" keeps this placeholder until Phase 4 builds a real Landing page — not this
// prompt's concern (just wiring the Authentication pages into routing).
function Placeholder() {
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <h1>ElderHive</h1>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/super-admin" element={<SuperAdminLoginPage />} />
      <Route path="/login/elder" element={<ElderLoginPage />} />
      <Route path="/login/caretaker" element={<CaretakerLoginPage />} />
      <Route path="/login/family" element={<FamilyLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
    </Routes>
  );
}

export default App;
