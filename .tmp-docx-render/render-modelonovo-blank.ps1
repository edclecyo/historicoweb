$ErrorActionPreference = "Stop"

$root = (Resolve-Path ".").Path
$docxPath = Join-Path $root "modelonovo.docx"
$outDir = Join-Path $root ".tmp-docx-render"
$pdfPath = Join-Path $outDir "modelonovo-blank-latest.pdf"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$word = New-Object -ComObject Word.Application
try { $word.DisplayAlerts = 0 } catch { }

function Clear-CellText($cell) {
  $range = $cell.Range
  $range.End = $range.End - 1
  $range.Text = ""
}

function Try-ClearCell($table, [int]$row, [int]$col) {
  try {
    Clear-CellText $table.Cell($row, $col)
  } catch {
  }
}

function Clear-FindText($document, [string]$text) {
  $range = $document.Content
  $find = $range.Find
  $find.ClearFormatting()
  $find.Replacement.ClearFormatting()
  [void]$find.Execute($text, $false, $false, $false, $false, $false, $true, 1, $false, "", 2)
}

try {
  $doc = $word.Documents.Open($docxPath, $false, $true)

  $studentTable = $doc.Tables.Item(2)
  for ($col = 1; $col -le 4; $col++) {
    Try-ClearCell $studentTable 2 $col
  }

  $mainTable = $doc.Tables.Item(3)

  for ($row = 2; $row -le 3; $row++) {
    for ($col = 3; $col -le 11; $col++) {
      Try-ClearCell $mainTable $row $col
    }
  }

  for ($row = 4; $row -le 14; $row++) {
    for ($col = 4; $col -le 12; $col++) {
      Try-ClearCell $mainTable $row $col
    }
  }

  for ($row = 16; $row -le 26; $row++) {
    for ($col = 2; $col -le 10; $col++) {
      Try-ClearCell $mainTable $row $col
    }
  }

  for ($row = 27; $row -le 32; $row++) {
    for ($col = 1; $col -le 10; $col++) {
      Try-ClearCell $mainTable $row $col
    }
  }

  for ($col = 2; $col -le 10; $col++) {
    Try-ClearCell $mainTable 33 $col
  }

  for ($col = 2; $col -le 10; $col++) {
    Try-ClearCell $mainTable 34 $col
  }

  for ($row = 35; $row -le 37; $row++) {
    for ($col = 3; $col -le 11; $col++) {
      Try-ClearCell $mainTable $row $col
    }
  }

  for ($row = 40; $row -le 48; $row++) {
    for ($col = 3; $col -le 6; $col++) {
      Try-ClearCell $mainTable $row $col
    }
  }

  $observationsTable = $doc.Tables.Item(4)
  Try-ClearCell $observationsTable 2 1

  Clear-FindText $doc "TESTE DE COMO DEVE SER"
  Clear-FindText $doc "TESTE DO NOME COMO DEVE SER NO CERTIFICADO"
  Clear-FindText $doc "Brejo Santo- Ceará, 06/04/2026"
  Clear-FindText $doc "Brejo Santo- Ceara, 06/04/2026"
  Clear-FindText $doc "9° ANO"
  Clear-FindText $doc "9º ANO"
  Clear-FindText $doc "ENSINO MEDIO"
  Clear-FindText $doc "2026"

  $doc.ExportAsFixedFormat($pdfPath, 17)
  $doc.Close($false)
} finally {
  $word.Quit()
}

Write-Output $pdfPath
