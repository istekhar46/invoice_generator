"""Independent PDF text, geometry and page-render QA for fictional quotations."""
import json
import re
import sys
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
root = Path(sys.argv[1])
report = []
for fixture in json.loads((root / 'manifest.json').read_text()):
    reader = PdfReader(root / (fixture['name'] + '.pdf'))
    assert reader.metadata.title == 'Quotation ' + fixture['quoteNumber']
    texts = []
    with pdfplumber.open(root / (fixture['name'] + '.pdf')) as document:
        for index, page in enumerate(document.pages):
            text = page.extract_text() or ''
            normalized = re.sub(r'\s+', ' ', text)
            footer = f"Quotation {fixture['quoteNumber']} | {fixture['status']} | {index + 1} / {len(document.pages)}"
            assert footer in normalized, (fixture['name'], 'missing footer', footer)
            assert all(c['x0'] >= 0 and c['x1'] <= page.width and c['top'] >= 0 and c['bottom'] <= page.height for c in page.chars), 'Text outside page'
            page.to_image(resolution=110).save(root / f"{fixture['name']}-page-{index + 1}.png")
            texts.append(text)
    full = '\n'.join(texts)
    assert 'QUOTATION' in full and 'QUOTE FOR' in full
    assert 'Valid until (UTC): ' + fixture['validUntil'] in full
    assert 'Quotation date: ' + fixture['quoteDate'] in full
    assert not re.search(r'Amount paid|Balance due|PAY BY UPI|INVOICE', full)
    assert re.search(r'Total \(' + fixture['currency'] + r'\)\s+' + f"{fixture['total']:.2f}", full)
    if fixture['name'] == 'accepted':
        assert '0.335' in full and '0.67' in full, 'Unit-rate/saved-row precision lost'
        assert 'Logo artwork' in full and 'Design service' in full
    else:
        assert len(reader.pages) > 1
        for i in range(75): assert 'Service ' + str(i+1).zfill(2) in full
    assert not any(a.get_object().get('/A', {}).get('/URI') for page in reader.pages for a in page.get('/Annots', [])), 'Unexpected payment link'
    (root / (fixture['name'] + '.txt')).write_text(full)
    report.append({'name':fixture['name'],'pages':len(reader.pages),'rows':fixture['rows'],'bounds':'passed','financialSnapshot':'passed','quoteLabels':'passed'})
(root / 'verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'passed':True,'fixtures':report}))
