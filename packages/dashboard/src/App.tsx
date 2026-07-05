import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CampaignList } from "./pages/CampaignList";
import { CampaignDetail } from "./pages/CampaignDetail";
import { CreateCampaign } from "./pages/CreateCampaign";
import { SecurityAlerts } from "./pages/SecurityAlerts";
import { QueuePage } from "./pages/QueuePage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CampaignList />} />
        <Route path="/alerts" element={<SecurityAlerts />} />
        <Route path="/queues/approvals" element={<QueuePage type="approvals" />} />
        <Route path="/queues/attention" element={<QueuePage type="attention" />} />
        <Route path="/queues/completed" element={<QueuePage type="completed" />} />
        <Route path="/campaigns/new" element={<CreateCampaign />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="*" element={<p className="text-muted">Not found.</p>} />
      </Routes>
    </Layout>
  );
}
