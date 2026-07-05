import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CampaignList } from "./pages/CampaignList";
import { CampaignDetail } from "./pages/CampaignDetail";
import { CreateCampaign } from "./pages/CreateCampaign";
import { SecurityAlerts } from "./pages/SecurityAlerts";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CampaignList />} />
        <Route path="/alerts" element={<SecurityAlerts />} />
        <Route path="/campaigns/new" element={<CreateCampaign />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="*" element={<p className="text-slate-500">Not found.</p>} />
      </Routes>
    </Layout>
  );
}
