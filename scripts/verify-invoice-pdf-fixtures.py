"""Inspect fictional export fixtures; requires pdfplumber, pypdf and zxing-cpp (QA tools only)."""
import json
import re
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import pdfplumber
from pypdf import PdfReader
import zxingcpp


def require(condition, message):
    if not condition:
        raise AssertionError(message)


root = Path(sys.argv[1] if len(sys.argv) > 1 else "release-artifacts.local/invoice-pdf-20261103")
manifest = json.loads((root / "manifest.json").read_text())
require(len(manifest) == 9, "Expected all nine invoice/guest/gateway fixtures")
report = []
for fixture in manifest:
    name = fixture["name"]
    path = root / f"{name}.pdf"
    reader = PdfReader(path)
    is_voided = fixture["status"] == "voided"
    title = f"{'Voided invoice' if is_voided else 'Invoice'} {fixture['invoiceNumber']}"
    require(reader.metadata.title == title, f"{name}: incorrect document title")
    digits = 0 if fixture["currency"] == "JPY" else 2
    quantum = Decimal(1).scaleb(-digits)

    def money(value):
        return f"{Decimal(str(value)).quantize(quantum, rounding=ROUND_HALF_UP):,.{digits}f}"

    pages = []
    text_pages = []
    totals_pages = []
    qr_destinations = []
    with pdfplumber.open(path) as document:
        for index, page in enumerate(document.pages):
            text = page.extract_text() or ""
            normalized = re.sub(r"\s+", " ", text)
            footer = f"Invoice {fixture['invoiceNumber']}{' | VOIDED - No payment due' if is_voided else ''} | {index + 1} / {len(document.pages)}"
            require(footer in normalized, f"{name} page {index + 1}: missing invoice/status/page footer")
            if is_voided:
                require("VOIDED - No payment due" in normalized, f"{name} page {index + 1}: missing cancellation")
            outside = [char["text"] for char in page.chars if char["x0"] < 0 or char["x1"] > page.width or char["top"] < 0 or char["bottom"] > page.height]
            require(not outside, f"{name} page {index + 1}: text outside the page: {outside}")
            image = page.to_image(resolution=110)
            image.save(root / f"{name}-page-{index+1}.png")
            qr_destinations.extend(code.text for code in zxingcpp.read_barcodes(image.original))
            require(all(img['x0'] >= 0 and img['x1'] <= page.width and img['top'] >= 0 and img['bottom'] <= page.height for img in page.images), f'{name}: image outside page')
            (root / f"{name}-page-{index+1}.txt").write_text(text)
            text_pages.append(text)
            # Read the actual right-hand totals column, independently of layout trees.
            totals_pages.append(page.crop((page.width * 0.54, 0, page.width, page.height - 65)).extract_text() or "")
            pages.append({"page": index + 1, "characters": len(page.chars), "invoiceFooter": True, "voided": is_voided, "outOfBounds": 0})
    totals = "\n".join(totals_pages)

    def expect_total(label, value):
        require(re.search(re.escape(label) + r"\s+" + re.escape(money(value)) + r"(?![\d.,])", totals), f"{name}: expected {label} {money(value)} in exported PDF")

    expect_total("Subtotal", fixture["subtotal"])
    expect_total(f"Tax ({fixture['taxRate'] * 100:g}%)", fixture["tax"])
    expect_total(f"Total ({fixture['currency']})", fixture["total"])
    expect_total("Amount paid", fixture["amountPaid"])
    balance = Decimal(0) if is_voided else Decimal(str(fixture["total"])) - Decimal(str(fixture["amountPaid"]))
    expect_total(f"Balance due ({fixture['currency']})", balance)
    if fixture["discountValue"]:
        discount = Decimal(str(fixture["discountValue"]))
        if fixture["discountType"] != "fixed":
            discount = Decimal(str(fixture["subtotal"])) * discount / 100
        expect_total("Discount", -discount)
    if fixture["shipping"]:
        expect_total("Shipping", fixture["shipping"])
    full_text = "\n".join(text_pages)
    links = [str(annotation.get_object().get('/A', {}).get('/URI', '')) for page in reader.pages for annotation in page.get('/Annots', [])]
    if name.startswith('gateway-live-'):
        require('PAY BY UPI' in full_text and fixture['paymentUrl'] in links, 'Live payment URL must be visible and clickable')
        require('Scan to open secure payment page' in full_text, 'Missing QR explanation')
        require(qr_destinations == [fixture['paymentUrl']], f'{name}: rendered QR destination mismatch: {qr_destinations}')
    else:
        require(not any('rzp.io' in url for url in links), f'{name}: unexpected gateway link')
        require(not qr_destinations, f'{name}: unexpected payment QR')
    if name.startswith("legacy-"):
        for row in [1, 2]:
            require(f"Preserved historical row {row} 1 each 0.34 0.34" in full_text, f"{name}: historical row {row} was lost or repriced")
    if name in ("voided-multipage", "gateway-live-multipage"):
        require(len(pages) > 1, "Multi-page fixture unexpectedly fits one page")
        rows = re.findall(r"Stock item (\d{2}) -", full_text)
        require(rows == [f"{row:02}" for row in range(1, 49)], "A line item was lost, duplicated, or reordered at a page break")
        for text in text_pages:
            if "Stock item" not in text:
                require("ITEM / SERVICE" not in text, "Table heading repeated after the line-item table ended")
    report.append({"name": name, "pages": pages, "savedTotals": True, "zeroVoidedBalance": is_voided})

(root / "verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"passed": True, "documents": len(report), "pages": sum(len(item["pages"]) for item in report), "checks": ["saved totals and rows", "discount/tax/shipping", "partial/full/voided balances", "currency precision", "metadata", "invoice/cancellation context on every page", "page numbers", "page bounds", "multi-page row preservation", "independently decoded rendered payment QR" ]}))
