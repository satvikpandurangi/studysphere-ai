from pathlib import Path
path=Path('outputs/studysphere-ai/src/pages/StaffPages.tsx')
text=path.read_text(encoding='utf-8')
old="setPdfText(await extractPdf(file))}if(profile?.role"
new="}const extracted=file?await extractPdf(file):pdfText;if(file)setPdfText(extracted);if(profile?.role"
assert old in text
text=text.replace(old,new)
old="pdf_text:file?await extractPdf(file):pdfText||null"
new="pdf_text:extracted||null"
assert old in text
path.write_text(text.replace(old,new),encoding='utf-8')
