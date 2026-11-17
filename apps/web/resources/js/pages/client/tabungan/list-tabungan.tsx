"use client";

import { Link } from "@inertiajs/react";

import { Card } from "@/components/ui/card";
import ClientLayout from "@/layouts/client-layout";
import React from "react";

type Tabungan = {
    id: string;
    name: string;
    imageUrl: string;
    prefixNumber: string;
};

const tabungan: Tabungan[] = [
    {
        id: "tamapas",
        name: "Tamapas",
        prefixNumber: "10.01.01.",
        imageUrl: "https://placehold.co/480x300/png?text=Tamapas",
    },
    {
        id: "tamara",
        name: "Tamara",
        prefixNumber: "10.01.01.",
        imageUrl: "https://placehold.co/480x300/png?text=Tamara",
    },
    {
        id: "kurban",
        name: "Tabungan Kurban",
        prefixNumber: "10.01.01.",
        imageUrl: "https://placehold.co/480x300/png?text=Tabungan+Kurban",
    },
    {
        id: "tabur-mabrur",
        name: "Tabur Mabrur",
        prefixNumber: "10.01.01.",
        imageUrl: "https://placehold.co/480x300/png?text=Tabur+Mabrur",
    },
    {
        id: "tabunganku",
        name: "TabunganKu",
        prefixNumber: "10.01.01.",
        imageUrl: "https://placehold.co/480x300/png?text=TabunganKu",
    },
    {
        id: "simapan",
        name: "Simapan",
        prefixNumber: "10.01.01.",
        imageUrl: "https://placehold.co/480x300/png?text=Simapan",
    },
    {
        id: "sompel",
        name: "Sompel",
        prefixNumber: "10.01.01.",
        imageUrl: "https://placehold.co/480x300/png?text=Sompel",
    },
    {
        id: "blt",
        name: "Tabungan BLT",
        prefixNumber: "10.01.01.",
        imageUrl: "https://placehold.co/480x300/png?text=Tabungan+BLT",
    },
    {
        id: "tawon",
        name: "Tabungan Tawon",
        prefixNumber: "10.01.01.",
        imageUrl: "https://placehold.co/480x300/png?text=Tabungan+Tawon",
    },
];

interface ListTabunganPageProps {
    branchName?: string;
}

export default function ListTabunganPage({
    branchName = "Cabang Pusat",
}: ListTabunganPageProps) {
    return (
        <>
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Pilih jenis tabungan
                </h2>
            </section>

            <section
                aria-label="Daftar produk tabungan"
                className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
                {tabungan.map((product) => {
                    return (
                        <Link
                            key={product.id}
                            href={`/client/rekening?rek=${product.prefixNumber}`}
                            // className="group block  outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                        >
                            <Card className="group/card relative h-45 w-full max-w-xs overflow-hidden border-0 p-0!">
                                <img
                                    src="https://picsum.photos/1000/800?grayscale&random=62"
                                    alt="Background"
                                    width={1000}
                                    height={800}
                                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                                />
                                {/* Background fade effects */}
                                <div className="absolute inset-x-0 bottom-0 h-full bg-primary/70 transition-opacity duration-500 group-hover/card:from-black/70" />
                                {/* Content */}
                                <div className="relative flex h-full flex-col justify-end p-6">
                                    <h3 className="text-xl font-bold text-white">
                                        {product.name}
                                    </h3>
                                    <p className="mt-2 text-sm text-white/90">
                                        This card features a smooth image
                                        scaling effect and background overlay on
                                        hover.
                                    </p>
                                </div>
                            </Card>
                        </Link>
                    );
                })}
            </section>
        </>
    );
}

ListTabunganPage.layout = (page: React.ReactNode) => (
    <ClientLayout>{page}</ClientLayout>
);
