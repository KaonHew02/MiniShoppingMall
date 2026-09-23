# Opens the generated proposal .docx in Microsoft Word, fills in the table of
# contents and the page fields, saves it back as a native Word file, and
# exports the PDF beside it. Called by tools/build-proposal.mjs.
param([Parameter(Mandatory)][string]$Docx, [Parameter(Mandatory)][string]$Pdf)
$ErrorActionPreference = 'Stop'
if (Test-Path $Pdf) { Remove-Item $Pdf -Force }
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($Docx, $false, $false, $false)
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Fields.Update() | Out-Null
    # a second pass: the contents page's own length can move every page number after it
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Save()
    # 17 = PDF; bookmarks from headings, document properties kept
    $doc.ExportAsFixedFormat($Pdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1)
    "pages: " + $doc.ComputeStatistics(2)
    $doc.Close($false)
} finally {
    $word.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
