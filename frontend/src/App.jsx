import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Doctors from './pages/Doctors';
import Departments from './pages/Departments';
import Appointments from './pages/Appointments';
import MedicalRecords from './pages/MedicalRecords';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Admissions from './pages/Admissions';
import Profile from './pages/Profile';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/patients" element={
        <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}><Patients /></ProtectedRoute>
      } />
      <Route path="/doctors" element={
        <ProtectedRoute roles={['admin']}><Doctors /></ProtectedRoute>
      } />
      <Route path="/departments" element={
        <ProtectedRoute roles={['admin']}><Departments /></ProtectedRoute>
      } />
      <Route path="/appointments" element={
        <ProtectedRoute><Appointments /></ProtectedRoute>
      } />
      <Route path="/medical-records" element={
        <ProtectedRoute roles={['doctor', 'patient']}><MedicalRecords /></ProtectedRoute>
      } />
      <Route path="/billing" element={
        <ProtectedRoute roles={['admin', 'receptionist', 'patient']}><Billing /></ProtectedRoute>
      } />
      <Route path="/inventory" element={
        <ProtectedRoute roles={['admin', 'receptionist']}><Inventory /></ProtectedRoute>
      } />
      <Route path="/admissions" element={
        <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}><Admissions /></ProtectedRoute>
      } />
    </Routes>
  );
}
