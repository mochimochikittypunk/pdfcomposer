'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PdfSplitter } from '@/components/features/pdf-splitter';
import { ImageToPdf } from '@/components/features/image-to-pdf';
import { PdfToImage } from '@/components/features/pdf-to-image';
import { SbiCsvConverter } from '@/components/features/sbi-csv-converter';
import { PortfolioVisualizer } from '@/components/features/portfolio-visualizer';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b bg-muted/30 sticky top-0 z-10 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">PDF & Tools</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Beta</span>
        </div>
      </header>

      <div className="w-full flex-1">
        <Tabs defaultValue="splitter" className="w-full flex flex-col h-full">
          <div className="w-full border-b bg-muted/10">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <TabsList className="h-12 w-full max-w-4xl bg-transparent p-0 gap-8 justify-start overflow-x-auto">
                <TabsTrigger
                  value="splitter"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 text-base whitespace-nowrap"
                >
                  PDF Splitter
                </TabsTrigger>
                <TabsTrigger
                  value="image-to-pdf"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 text-base whitespace-nowrap"
                >
                  Image to PDF
                </TabsTrigger>
                <TabsTrigger
                  value="pdf-to-image"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 text-base whitespace-nowrap"
                >
                  PDF to Image
                </TabsTrigger>
                <TabsTrigger
                  value="sbi-csv"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 text-base whitespace-nowrap"
                >
                  SBI CSV
                </TabsTrigger>
                <TabsTrigger
                  value="portfolio"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 text-base whitespace-nowrap"
                >
                  Dividend Viz
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="flex-1 py-6">
            <TabsContent value="splitter" className="m-0 h-full border-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <PdfSplitter />
            </TabsContent>
            <TabsContent value="image-to-pdf" className="m-0 h-full border-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <ImageToPdf />
            </TabsContent>
            <TabsContent value="pdf-to-image" className="m-0 h-full border-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <PdfToImage />
            </TabsContent>
            <TabsContent value="sbi-csv" className="m-0 h-full border-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <SbiCsvConverter />
            </TabsContent>
            <TabsContent value="portfolio" className="m-0 h-full border-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <PortfolioVisualizer />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </main>
  );
}
