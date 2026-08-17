'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Product, ApplyPricingPayload, ApplyPricingResponse } from '@/types/product';
import { ProductSearch } from '@/components/salla/product-search';
import { ProductGrid } from '@/components/salla/product-grid';
import { DiscountModal } from '@/components/salla/discount-modal';
import { SallaSDK } from '@/lib/salla-sdk';

export default function EmbedProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Discount modal state
    const [discountModalOpen, setDiscountModalOpen] = useState(false);
    const [discountModalTargets, setDiscountModalTargets] = useState<Product[]>([]);

    const fetchProducts = useCallback(async (query: string = "") => {
        try {
            if (query) {
                setSearching(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const token = localStorage.getItem('jwtToken');
            if (!token) {
                throw new Error("Authentication error: No token found in session.");
            }

            const url = `/api/v1/salla/embed/products${query ? `?query=${encodeURIComponent(query)}` : ""}`;
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    SallaSDK.notify.error("Session expired. Please reload the dashboard.");
                }
                throw new Error("Failed to fetch products from backend API.");
            }

            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error("Fetch products error:", err);
            setError(err.message || "Failed to load products.");
        } finally {
            setLoading(false);
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Handle search triggers
    const handleSearch = () => {
        fetchProducts(searchQuery);
    };

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        if (query === "") {
            fetchProducts("");
        }
    };

    // Open modal for setting sale price
    const handleOpenSetSalePriceModal = (targetProducts: Product[]) => {
        setDiscountModalTargets(targetProducts);
        setDiscountModalOpen(true);
    };

    // Apply pricing action (set_sale or remove_sale)
    const handleApplyPricing = async (payload: ApplyPricingPayload) => {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            SallaSDK.notify.error("Authentication error: Token missing.");
            throw new Error("Authentication error: Token missing.");
        }

        const res = await fetch('/api/v1/salla/embed/products/discount', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error || "Failed to update pricing.";
            SallaSDK.notify.error(errMsg);
            throw new Error(errMsg);
        }

        const data: ApplyPricingResponse = await res.json();

        if (data.success) {
            if (payload.action === 'remove_sale') {
                SallaSDK.notify.success(`Successfully removed sale price from ${payload.productIds.length} product(s).`);
            } else {
                SallaSDK.notify.success(`Successfully set sale price for ${payload.productIds.length} product(s).`);
            }
            // Re-fetch products to reflect updated prices from Salla API
            await fetchProducts(searchQuery);
            // Clear selection after update
            setSelectedIds([]);
        }
    };

    // Remove sale price with confirmation
    const handleRemoveSalePrice = async (targetProducts: Product[]) => {
        const productCount = targetProducts.length;
        const confirmMessage = productCount === 1
            ? `Are you sure you want to remove the sale price for "${targetProducts[0].name}"?`
            : `Are you sure you want to remove sale prices for ${productCount} selected products?`;

        const confirmed = await SallaSDK.confirm({
            title: "Remove Sale Price",
            text: confirmMessage,
            confirmText: "Remove Sale",
            cancelText: "Cancel",
        });

        if (!confirmed) return;

        try {
            await handleApplyPricing({
                productIds: targetProducts.map((p) => p.id),
                action: 'remove_sale',
            });
        } catch (err) {
            // Handled in handleApplyPricing
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header section with Title & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Store Products & Pricing</h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        Manage store products, set promotional sale prices, and remove discounts in bulk.
                    </p>
                </div>

                <ProductSearch
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onSearch={handleSearch}
                    loading={searching}
                />
            </div>

            {/* Main Product Grid */}
            <ProductGrid
                products={products}
                loading={loading}
                error={error}
                selectedIds={selectedIds}
                onSelectedIdsChange={setSelectedIds}
                onSetSalePriceForProducts={handleOpenSetSalePriceModal}
                onRemoveSalePriceForProducts={handleRemoveSalePrice}
            />

            {/* Discount / Pricing Modal */}
            <DiscountModal
                open={discountModalOpen}
                onOpenChange={setDiscountModalOpen}
                products={discountModalTargets}
                onApply={handleApplyPricing}
            />
        </div>
    );
}