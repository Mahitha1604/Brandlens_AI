"use client";

import React from 'react';
import { BrandKnowledgeHub } from '@/components/BrandKnowledgeHub';
import { useBrandSession } from '@/context/BrandSessionContext';

export default function BrandKnowledgePage() {
  const {
    brands,
    selectedBrandId,
    setSelectedBrandId,
    refreshBrands,
    currentPersona,
    isLoadingBrands,
  } = useBrandSession();

  if (isLoadingBrands) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-xs text-gray-500">Loading brand knowledge profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <BrandKnowledgeHub
        key={selectedBrandId}
        brands={brands}
        selectedBrandId={selectedBrandId}
        onSelectBrand={setSelectedBrandId}
        onBrandUpdated={refreshBrands}
        currentPersona={currentPersona}
      />
    </div>
  );
}
