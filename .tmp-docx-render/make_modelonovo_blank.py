from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "modelonovo.docx"
OUTPUT = ROOT / ".tmp-docx-render" / "modelonovo-blank-latest.docx"
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def clear_cell(cell: ET.Element) -> None:
    for text in cell.findall(".//w:t", NS):
        text.text = ""


def clear_cell_at(table: ET.Element, row_index: int, col_index: int) -> None:
    rows = table.findall("./w:tr", NS)
    if row_index > len(rows):
        return
    cells = rows[row_index - 1].findall("./w:tc", NS)
    if col_index > len(cells):
        return
    clear_cell(cells[col_index - 1])


def replace_text(root: ET.Element, old: str, new: str = "") -> None:
    for text in root.findall(".//w:t", NS):
        if text.text and old in text.text:
            text.text = text.text.replace(old, new)


def clear_paragraph_containing(root: ET.Element, needle: str) -> None:
    for paragraph in root.findall(".//w:p", NS):
        text_nodes = paragraph.findall(".//w:t", NS)
        full_text = "".join(text.text or "" for text in text_nodes)
        if needle in full_text:
            for text in text_nodes:
                text.text = ""


with ZipFile(INPUT, "r") as source:
    document_xml = source.read("word/document.xml")
    root = ET.fromstring(document_xml)
    tables = root.findall(".//w:tbl", NS)

    student_table = tables[1]
    for col in range(1, 5):
        clear_cell_at(student_table, 2, col)

    main_table = tables[2]
    for row in range(2, 4):
        for col in range(3, 12):
            clear_cell_at(main_table, row, col)

    for row in range(4, 15):
        for col in range(4, 13):
            clear_cell_at(main_table, row, col)

    for row in range(16, 27):
        for col in range(2, 11):
            clear_cell_at(main_table, row, col)

    for row in range(27, 33):
        for col in range(1, 11):
            clear_cell_at(main_table, row, col)

    for col in range(2, 11):
        clear_cell_at(main_table, 33, col)
        clear_cell_at(main_table, 34, col)

    for row in range(35, 38):
        for col in range(3, 12):
            clear_cell_at(main_table, row, col)

    for row in range(40, 49):
        for col in range(3, 7):
            clear_cell_at(main_table, row, col)

    clear_cell_at(tables[3], 2, 1)

    for sample in (
        "TESTE DE COMO DEVE SER",
        "TESTE PAI",
        "TESTE MAE",
        "TESTE DO NOME COMO DEVE SER NO CERTIFICADO",
        "9� ANO",
        "9° ANO",
        "9º ANO",
        "2026",
        "ENSINO MEDIO",
    ):
        replace_text(root, sample)

    clear_paragraph_containing(root, "Brejo Santo- Cear")

    updated_document_xml = ET.tostring(root, encoding="utf-8", xml_declaration=True)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as target:
        for info in source.infolist():
            data = source.read(info.filename)
            if info.filename == "word/document.xml":
                data = updated_document_xml
            target.writestr(info, data)

print(OUTPUT)
