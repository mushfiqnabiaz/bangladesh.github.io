import { getDashboardData } from "@/lib/data";
import { BangladeshDataApp } from "@/components/BangladeshDataApp";

export default async function Home() {
  const data = await getDashboardData();
  return <BangladeshDataApp initialData={data} />;
}
