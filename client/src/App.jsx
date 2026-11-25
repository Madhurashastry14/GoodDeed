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

import CreateOpportunity from "./pages/createOpportunity";
import Opportunities from "./pages/opportunities";
import OpportunityDetails from "./pages/opportunityDetails";
import EditOpportunity from "./pages/editOpportunity";
import MyActivities from "./pages/myActivities";
import OwnerDashboard from "./pages/ownerDashboard";
import Items from "./pages/items";
import ItemDetails from "./pages/itemDetails";
import ItemForm from "./pages/itemForm";
import HelpRequests from "./pages/helpRequests";
import ItemRequestForm from "./pages/itemRequestForm";
import ItemRequestDetails from "./pages/itemRequestDetails";
import AdminItemRequests from "./pages/adminItemRequests";
import ReviewerRoute from "./components/reviewerRoute";

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
          path="/organizations/:id/dashboard"
          element={
            <ProtectedRoute>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
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

        <Route
          path="/organizations/:id/opportunities/new"
          element={
            <ProtectedRoute>
              <CreateOpportunity />
            </ProtectedRoute>
          }
        />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/opportunities/:id" element={<OpportunityDetails />} />
        <Route
          path="/opportunities/:id/edit"
          element={
            <ProtectedRoute>
              <EditOpportunity />
            </ProtectedRoute>
          }
        />
        <Route path="/items" element={<Items />} />
        <Route
          path="/items/new"
          element={
            <ProtectedRoute>
              <ItemForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/items/:id/edit"
          element={
            <ProtectedRoute>
              <ItemForm />
            </ProtectedRoute>
          }
        />
        <Route path="/items/:id" element={<ItemDetails />} />
        <Route path="/help-requests" element={<HelpRequests />} />
        <Route
          path="/help-requests/new"
          element={
            <ProtectedRoute>
              <ItemRequestForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help-requests/:id/edit"
          element={
            <ProtectedRoute>
              <ItemRequestForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help-requests/:id"
          element={<ItemRequestDetails />}
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
              <MyActivities />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/item-requests"
          element={
            <ReviewerRoute>
              <AdminItemRequests />
            </ReviewerRoute>
          }
        />

        <Route path="*" element={<ComingSoon title="Page Not Found" />} />
      </Routes>
    </BrowserRouter>
  );
}
