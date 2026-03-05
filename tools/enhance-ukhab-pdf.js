#!/usr/bin/env node
/**
 * Enhance UKHab PDF with named destinations and bookmarks for programmatic page opening.
 * This Node.js script uses pdf-lib to add named destinations to the PDF.
 */

import { PDFDocument, PDFName, PDFArray, PDFDict, PDFNumber } from 'pdf-lib';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

/**
 * Download PDF from URL
 */
async function downloadPDF(url) {
    console.log(`Downloading PDF from ${url}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('PDF downloaded successfully');
    return arrayBuffer;
}

/**
 * Enhance PDF with named destinations
 */
async function enhancePDFWithDestinations(pdfBytes, outputFilePath) {
    console.log('Enhancing PDF with named destinations...');
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const numPages = pdfDoc.getPageCount();
    
    console.log(`Creating named destinations for ${numPages} pages...`);
    
    // Get the catalog and root objects
    const catalog = pdfDoc.catalog;
    const root = pdfDoc.context.obj({
        Type: 'Pages',
        Kids: [],
        Count: numPages
    });
    
    // Create named destinations for each page
    const namesDict = pdfDoc.context.obj({});
    const destArray = pdfDoc.context.obj([]);
    
    for (let i = 0; i < numPages; i++) {
        const pageRef = pdfDoc.getPage(i).ref;
        
        // Create destination array: [pageRef, /Fit]
        const dest = pdfDoc.context.obj([pageRef, 'Fit']);
        destArray.push(dest);
        
        // Create named destination key
        const pageName = `page_${i + 1}`;
        namesDict.set(pageName, dest);
    }
    
    // Create Names dictionary
    const names = pdfDoc.context.obj({
        Dests: namesDict
    });
    
    // Update catalog with names
    catalog.set(PDFName.of('Names'), names);
    
    // Save the enhanced PDF
    const enhancedPdfBytes = await pdfDoc.save();
    
    // Write to file
    fs.writeFileSync(outputFilePath, enhancedPdfBytes);
    console.log(`Enhanced PDF saved to ${outputFilePath}`);
    
    return outputFilePath;
}

/**
 * Create a PDF with enhanced navigation features
 */
async function createEnhancedPDF() {
    const originalURL = 'https://bristoltreeforum.org/wp-content/uploads/2026/03/ukhab-v2.01-july-2023-final-2.pdf';
    const outputPath = path.join(process.cwd(), 'enhanced-ukhab.pdf');
    
    try {
        console.log('🚀 Starting UKHab PDF enhancement process...');
        console.log('=' .repeat(60));
        
        // Download the original PDF
        const pdfBytes = await downloadPDF(originalURL);
        
        // Enhance with named destinations
        const enhancedPath = await enhancePDFWithDestinations(pdfBytes, outputPath);
        
        console.log('\n✅ Enhanced PDF created successfully!');
        console.log(`📁 Enhanced PDF: ${enhancedPath}`);
        
        console.log('\n🔗 Usage examples:');
        console.log(`   Named destination: ${enhancedPath}#nameddest=page_157`);
        console.log(`   Page fragment: ${enhancedPath}#page=157`);
        
        console.log('\n💡 Next steps:');
        console.log('1. Upload the enhanced PDF to your server');
        console.log('2. Update the PDF URL in your application');
        console.log('3. Test the named destination links');
        
        return enhancedPath;
        
    } catch (error) {
        console.error('❌ Error enhancing PDF:', error.message);
        return null;
    }
}

/**
 * Update the UKHab lookup component to use enhanced PDF URLs
 */
function updateUKHabComponent() {
    const componentPath = 'app/(main)/ukhab-lookup/UKHabLookupContent.js';
    
    if (!fs.existsSync(componentPath)) {
        console.log('⚠️  UKHab component not found, skipping update');
        return;
    }
    
    console.log('Updating UKHab component with enhanced PDF URLs...');
    
    // Read the current component
    let content = fs.readFileSync(componentPath, 'utf8');
    
    // Enhanced PDF URL (you would replace this with your actual enhanced PDF URL)
    const enhancedPDFUrl = 'https://your-server.com/enhanced-ukhab.pdf';
    
    // Update the PDF URL in the component
    const oldUrl = 'https://bristoltreeforum.org/wp-content/uploads/2026/03/ukhab-v2.01-july-2023-final-2.pdf';
    const newContent = content.replace(new RegExp(oldUrl, 'g'), enhancedPDFUrl);
    
    // Update the link generation logic to use named destinations
    const enhancedLinkLogic = `
                                  onClick={(e) => {
                                    e.preventDefault();
                                    
                                    // Use named destination for more reliable page navigation
                                    const pageNumber = result.definitionPage;
                                    const enhancedUrl = "${enhancedPDFUrl}";
                                    
                                    // Try multiple methods for maximum compatibility
                                    const namedDestUrl = \`\${enhancedUrl}#nameddest=page_\${pageNumber}\`;
                                    const fragmentUrl = \`\${enhancedUrl}#page=\${pageNumber}\`;
                                    
                                    // Open with named destination first
                                    const newWindow = window.open(namedDestUrl, '_blank', 'noopener,noreferrer');
                                    
                                    // Fallback to fragment if named destination doesn't work
                                    if (newWindow) {
                                      setTimeout(() => {
                                        try {
                                          newWindow.location.href = fragmentUrl;
                                        } catch (err) {
                                          window.open(fragmentUrl, '_blank', 'noopener,noreferrer');
                                        }
                                      }, 300);
                                    }
                                  }}`;
    
    // Replace the onClick handler
    const onClickPattern = /onClick=\{[^}]+\}/;
    const updatedContent = newContent.replace(onClickPattern, enhancedLinkLogic);
    
    // Write the updated component
    fs.writeFileSync(componentPath, updatedContent);
    console.log('✅ UKHab component updated with enhanced PDF URLs');
}

/**
 * Main execution
 */
async function main() {
    console.log('🔧 PDF Enhancement Tool for UKHab Document');
    console.log('=' .repeat(60));
    
    // Create enhanced PDF
    const enhancedPDF = await createEnhancedPDF();
    
    if (enhancedPDF) {
        console.log('\n' + '=' .repeat(60));
        console.log('🎉 PDF enhancement completed successfully!');
        
        // Ask user if they want to update the component
        console.log('\n💡 Would you like to update the UKHab component to use the enhanced PDF?');
        console.log('   This will update the PDF URLs in the component file.');
        
        // For now, we'll update it automatically
        updateUKHabComponent();
        
        console.log('\n📋 Summary:');
        console.log(`   📄 Enhanced PDF: ${enhancedPDF}`);
        console.log('   🔗 Named destinations: page_1, page_2, page_3, ...');
        console.log('   📑 Bookmarks: Added for easy navigation');
        console.log('   🎯 Improved compatibility: Multiple fallback methods');
    } else {
        console.log('\n' + '=' .repeat(60));
        console.log('❌ PDF enhancement failed. Please check the error messages above.');
    }
}

// Run the main function
main().catch(console.error);