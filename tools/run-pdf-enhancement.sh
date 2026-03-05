#!/bin/bash

# PDF Enhancement Script for UKHab Document
# This script provides an easy way to enhance the UKHab PDF

echo "🔧 PDF Enhancement Tool for UKHab Document"
echo "=========================================="
echo ""

# Check if Node.js is available
if command -v node &> /dev/null; then
    echo "✅ Node.js found - using Node.js enhancement script"
    echo ""
    
    # Run the Node.js script
    node tools/enhance-ukhab-pdf.js
    
elif command -v python3 &> /dev/null; then
    echo "✅ Python3 found - using Python enhancement script"
    echo ""
    
    # Check if required Python packages are installed
    python3 -c "import PyPDF2, requests, reportlab" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Required Python packages are installed"
        python3 tools/enhance-ukhab-pdf.py
    else
        echo "❌ Required Python packages not found"
        echo "Please install them with: pip install -r tools/requirements-pdf-enhance.txt"
        echo ""
        echo "Or use the Node.js version if available"
    fi
    
else
    echo "❌ Neither Node.js nor Python3 found"
    echo ""
    echo "Please install one of the following:"
    echo "  - Node.js: https://nodejs.org/"
    echo "  - Python3: https://python.org/"
    echo ""
    echo "Or run the scripts directly:"
    echo "  - Node.js: node tools/enhance-ukhab-pdf.js"
    echo "  - Python: python3 tools/enhance-ukhab-pdf.py"
fi

echo ""
echo "📖 For more information, see: tools/README-pdf-enhancement.md"