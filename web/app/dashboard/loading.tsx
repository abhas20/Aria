import { WomenHealthLoader } from "@/components/general/WomenHealthLoader";

export default function DashboardLoading() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
      <WomenHealthLoader label="Loading your wellness space" />
    </div>
  );
}
