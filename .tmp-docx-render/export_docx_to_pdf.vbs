Option Explicit

Dim inputPath, outputPath, word, doc
inputPath = WScript.Arguments.Item(0)
outputPath = WScript.Arguments.Item(1)

Set word = CreateObject("Word.Application")
word.DisplayAlerts = 0
Set doc = word.Documents.Open(inputPath, False, True)
doc.ExportAsFixedFormat outputPath, 17
doc.Close False
word.Quit

WScript.Echo outputPath
