export function IntegrationStatus() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
      <div className="bg-[#261B0E]/80 border border-[#3D2E1A] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-[#4ECDA4] rounded-full"></div>
          <p className="text-[#8B8070] text-sm">Fivetran</p>
        </div>
        <p className="text-xl font-bold text-[#E8D8B0]">Data Sync</p>
        <p className="text-[#6B5E52] text-xs mt-2">Live rates & balances</p>
      </div>

      <div className="bg-[#261B0E]/80 border border-[#3D2E1A] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-[#4ECDA4] rounded-full"></div>
          <p className="text-[#8B8070] text-sm">MongoDB</p>
        </div>
        <p className="text-xl font-bold text-[#E8D8B0]">Data Store</p>
        <p className="text-[#6B5E52] text-xs mt-2">Portfolio persistence</p>
      </div>

      <div className="bg-[#261B0E]/80 border border-[#3D2E1A] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-[#4ECDA4] rounded-full"></div>
          <p className="text-[#8B8070] text-sm">Gemini AI</p>
        </div>
        <p className="text-xl font-bold text-[#E8D8B0]">Optimization</p>
        <p className="text-[#6B5E52] text-xs mt-2">Smart allocation</p>
      </div>
    </section>
  );
}
