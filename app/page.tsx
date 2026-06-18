import { getLandingData } from "@/lib/nara/bayse.functions";
import { DashboardMockup } from "@/components/nara/dashboardmockup";
import Navbar from "@/components/nara/navbar";

export default async function HomePage() {
  // 1. Fetch the data on the SERVER. This is instantly rendered into the HTML.
  const initialLandingData = await getLandingData();

  return (
    <main>
      <Navbar />
      {/* 2. Pass the server data down to your client components */}
      <DashboardMockup initialData={initialLandingData} />
    </main>
  );
}