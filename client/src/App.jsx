import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import OrganizationDetails from "./pages/organizationDetails";
import Organizations from "./pages/organizations";
import CreateOrganization from "./pages/createOrganization";
import MyOrganizations from "./pages/myOrganizations";
import Profile from "./pages/profile";
import EditOrganization from "./pages/editOrganization";
import OrganizationMembers from "./pages/organizationMembers";
import ProtectedRoute from "./components/protectedRoute";
import ComingSoon from "./components/comingSoon";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Authenticated dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/organizations" element={<Organizations />} />
        <Route
          path="/organizations/new"
          element={
            <ProtectedRoute>
              <CreateOrganization />
            </ProtectedRoute>
          }
        />
        <Route path="/organizations/:id" element={<OrganizationDetails />} />
        <Route
          path="/organizations/:id/edit"
          element={
            <ProtectedRoute>
              <EditOrganization />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-organizations"
          element={
            <ProtectedRoute>
              <MyOrganizations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizations/:id/members"
          element={<OrganizationMembers />}
        />

        {/* Profile: backend implemented, frontend next */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Planned backend features */}
        <Route
          path="/opportunities"
          element={<ComingSoon title="Volunteer Opportunities" />}
        />
        <Route
          path="/items"
          element={<ComingSoon title="Free Item Sharing" />}
        />
        <Route
          path="/help-requests"
          element={<ComingSoon title="Help Requests" />}
        />
        <Route
          path="/projects"
          element={<ComingSoon title="Community Projects" />}
        />
        <Route
          path="/campaigns"
          element={<ComingSoon title="Material Campaigns" />}
        />

        <Route
          path="/my-activities"
          element={
            <ProtectedRoute>
              <ComingSoon title="My Activities" />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<ComingSoon title="Page Not Found" />} />
      </Routes>
    </BrowserRouter>
  );
}
