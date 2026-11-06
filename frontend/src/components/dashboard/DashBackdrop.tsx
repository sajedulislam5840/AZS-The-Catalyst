/** Soft sky-and-ember glow behind the dashboard, matching the landing page. Pure CSS, no JS. */
export default function DashBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#E8F3FB] via-[#F3F8FC] to-[#F6FAFD]" />
      <div className="dash-grid-bg absolute inset-0" />
      <div className="azs-drift absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl md:h-[26rem] md:w-[26rem]" />
      <div className="azs-drift absolute -right-28 top-1/3 hidden h-96 w-96 rounded-full bg-[#CC310E]/10 blur-3xl md:block" style={{ animationDelay: "-3.5s" }} />
    </div>
  );
}
