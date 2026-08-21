from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "modelonovo.docx"
OUTPUT = ROOT / ".tmp-docx-render" / "modelonovo-blank-lxml-latest.docx"
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}


def clear_cell(cell: etree._Element) -> None:
    for text in cell.xpath(".//w:t", namespaces=NS):
        text.text = ""


def clear_cell_at(table: etree._Element, row_index: int, col_index: int) -> None:
    rows = table.xpath("./w:tr", namespaces=NS)
    if row_index > len(rows):
        return
    cells = rows[row_index - 1].xpath("./w:tc", namespaces=NS)
    if col_index > len(cells):
        return
    clear_cell(cells[col_index - 1])


def replace_text(root: etree._Element, old: str, new: str = "") -> None:
    for text in root.xpath(".//w:t", namespaces=NS):
        if text.text and old in text.text:
            text.text = text.text.replace(old, new)


def clear_paragraph_containing(root: etree._Element, needle: str) -> None:
    for paragraph in root.xpath(".//w:p", namespaces=NS):
        text_nodes = paragraph.xpath(".//w:t", namespaces=NS)
        full_text = "".join(text.text or "" for text in text_nodes)
        if needle in full_text:
            for text in text_nodes:
                text.text = ""


def replace_text_in_paragraph_containing(root: etree._Element, needle: str, samples: tuple[str, ...]) -> None:
    for paragraph in root.xpath(".//w:p", namespaces=NS):
        text_nodes = paragraph.xpath(".//w:t", namespaces=NS)
        full_text = "".join(text.text or "" for text in text_nodes)
        if needle in full_text:
            for text in text_nodes:
                if not text.text:
                    continue
                for sample in samples:
                    if sample in text.text:
                        text.text = text.text.replace(sample, "")


with ZipFile(INPUT, "r") as source:
    parser = etree.XMLParser(remove_blank_text=False, recover=False)
    root = etree.fromstring(source.read("word/document.xml"), parser)
    tables = root.xpath(".//w:tbl", namespaces=NS)

    student_table = tables[1]
    for col in range(1, 5):
        clear_cell_at(student_table, 2, col)

    main_table = tables[2]

    for col in range(3, 12):
        clear_cell_at(main_table, 2, col)

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
        "ENSINO MEDIO",
    ):
        replace_text(root, sample)

    replace_text_in_paragraph_containing(root, "Concluiu", ("9� ANO", "9° ANO", "9º ANO", "2026", "ENSINO MEDIO"))
    clear_paragraph_containing(root, "Brejo Santo- Cear")

    updated_document_xml = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as target:
        for info in source.infolist():
            data = source.read(info.filename)
            if info.filename == "word/document.xml":
                data = updated_document_xml
            target.writestr(info, data)

print(OUTPUT)
