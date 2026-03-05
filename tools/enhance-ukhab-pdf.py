#!/usr/bin/env python3
"""
Enhance UKHab PDF with named destinations and bookmarks for programmatic page opening.
This script adds named destinations for each page to enable reliable programmatic navigation.
"""

import requests
import tempfile
import os
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

def download_pdf(url, local_path):
    """Download PDF from URL to local file."""
    print(f"Downloading PDF from {url}...")
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    with open(local_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    print(f"PDF downloaded to {local_path}")
    return local_path

def enhance_pdf_with_destinations(input_path, output_path):
    """
    Enhance PDF with named destinations for each page.
    Creates named destinations like 'page_1', 'page_2', etc.
    """
    print("Enhancing PDF with named destinations...")
    
    # Read the original PDF
    reader = PdfReader(input_path)
    writer = PdfWriter()
    
    # Add all pages to the writer
    for page in reader.pages:
        writer.add_page(page)
    
    # Create named destinations for each page
    num_pages = len(reader.pages)
    print(f"Creating named destinations for {num_pages} pages...")
    
    # Add named destinations
    for page_num in range(1, num_pages + 1):
        # Create a named destination for this page
        destination_name = f"page_{page_num}"
        
        # Add the destination to the PDF
        writer.add_named_destination(destination_name, page_num - 1)  # 0-indexed
        
        if page_num % 50 == 0:
            print(f"  Created destinations up to page {page_num}")
    
    # Write the enhanced PDF
    with open(output_path, 'wb') as f:
        writer.write(f)
    
    print(f"Enhanced PDF saved to {output_path}")
    return output_path

def create_bookmarks_for_pages(input_path, output_path):
    """
    Create a structured bookmark hierarchy for easy navigation.
    """
    print("Creating bookmarks for pages...")
    
    reader = PdfReader(input_path)
    writer = PdfWriter()
    
    # Add all pages
    for page in reader.pages:
        writer.add_page(page)
    
    # Create main bookmark
    main_bookmark = writer.add_outline_item("UKHab Document Pages", 0)
    
    # Create bookmarks for every 10 pages
    num_pages = len(reader.pages)
    for i in range(0, num_pages, 10):
        page_num = i + 1
        if page_num <= num_pages:
            bookmark_title = f"Pages {page_num}-{min(page_num + 9, num_pages)}"
            writer.add_outline_item(bookmark_title, i, parent=main_bookmark)
    
    # Write the PDF with bookmarks
    with open(output_path, 'wb') as f:
        writer.write(f)
    
    print(f"PDF with bookmarks saved to {output_path}")
    return output_path

def create_enhanced_pdf():
    """Main function to enhance the UKHab PDF."""
    
    # URLs for the UKHab PDF
    original_url = "https://bristoltreeforum.org/wp-content/uploads/2026/03/ukhab-v2.01-july-2023-final-2.pdf"
    
    # Create temporary files
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_input:
        temp_input_path = temp_input.name
    
    with tempfile.NamedTemporaryFile(suffix='_enhanced.pdf', delete=False) as temp_output:
        temp_output_path = temp_output.name
    
    try:
        # Download the original PDF
        download_pdf(original_url, temp_input_path)
        
        # Enhance with named destinations
        enhanced_path = enhance_pdf_with_destinations(temp_input_path, temp_output_path)
        
        # Create final enhanced version with bookmarks
        final_path = temp_output_path.replace('.pdf', '_with_bookmarks.pdf')
        create_bookmarks_for_pages(enhanced_path, final_path)
        
        print(f"\n✅ Enhanced PDF created successfully!")
        print(f"📁 Enhanced PDF with named destinations: {enhanced_path}")
        print(f"📁 Enhanced PDF with bookmarks: {final_path}")
        
        print(f"\n🔗 Usage examples:")
        print(f"   Named destination: {final_path}#page=1&nameddest=page_157")
        print(f"   Page fragment: {final_path}#page=157")
        
        return final_path
        
    except Exception as e:
        print(f"❌ Error enhancing PDF: {e}")
        return None
    
    finally:
        # Clean up temporary files
        try:
            os.unlink(temp_input_path)
            os.unlink(temp_output_path)
        except:
            pass

if __name__ == "__main__":
    print("🚀 Starting UKHab PDF enhancement process...")
    print("=" * 60)
    
    final_pdf = create_enhanced_pdf()
    
    if final_pdf:
        print("\n" + "=" * 60)
        print("🎉 PDF enhancement completed successfully!")
        print(f"📄 Enhanced PDF location: {final_pdf}")
        print("\n💡 Next steps:")
        print("1. Upload the enhanced PDF to your server")
        print("2. Update the PDF URL in your application")
        print("3. Test the named destination links")
    else:
        print("\n" + "=" * 60)
        print("❌ PDF enhancement failed. Please check the error messages above.")