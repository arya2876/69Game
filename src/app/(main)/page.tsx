"use client";

import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import BranchSelector from "@/components/BranchSelector";
import FacilitiesSection from "@/components/FacilitiesSection";
import PromoSection from "@/components/PromoSection";
import HowToBookSection from "@/components/HowToBookSection";

export default function Home() {
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  return (
    <>
      <HeroSection />
      <BranchSelector activeBranchId={activeBranchId} setActiveBranchId={setActiveBranchId} />
      <FacilitiesSection activeBranchId={activeBranchId} />
      <HowToBookSection />
      <PromoSection activeBranchId={activeBranchId} />
    </>
  );
}
