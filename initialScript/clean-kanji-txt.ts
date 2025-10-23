import fs from 'fs'
import path from 'path'

/*
  Clean "Joyo Kanji + Jinmeiyou Kanji . JLPT. Grade. Kanken. Best Kanji Deck.txt"
  - Input format: tab-separated, first 3-4 lines are metadata (#separator:tab, ...)
  - Columns (observed):
    0: Deck/Category (contains strings like "JLPT.N5" inside tags at the end, and also in first column)
    1: Kanji (character)
    2: Kanji with furigana (e.g., 一[いち]) (optional)
    3: On'yomi (Katakana, separated by '、')
    4: Kun'yomi (Hiragana variants, separated by '、')
    5: Aliases (mixed) (optional)
    6: English meaning short (we'll use for mean)
    ... many extra columns ...
    23 (index 23): Tags (includes tokens like "JLPT.N5", "grade1", ...)

  - Output TSV columns (header): kanji	mean	detail	kun	on	jlpt	strokes
    * detail left empty (not present reliably)
    * jlpt parsed from tags: JLPT.N1..N5 -> level number (1-5). If not found, left empty
*/

function parseJlptFromTags(tags?: string): string {
    if (!tags) return ''
    const m = tags.match(/JLPT\.N([1-5])/i)
    return m ? m[1] : ''
}

function cleanReading(raw?: string): string {
    if (!raw) return ''
    // Split by '、' and commas/whitespace, join by comma
    return raw
        .split(/、|\s*,\s*/)
        .map(s => s.trim())
        .filter(Boolean)
        .join(', ')
}

function main() {
    const root = process.cwd()
    const inputPath = path.resolve(root, 'Joyo Kanji + Jinmeiyou Kanji . JLPT. Grade. Kanken. Best Kanji Deck.txt')
    const outputPath = path.resolve(root, 'kanji-clean.tsv')

    if (!fs.existsSync(inputPath)) {
        console.error('Input file not found:', inputPath)
        process.exit(1)
    }

    const raw = fs.readFileSync(inputPath, 'utf8')
    const lines = raw.split(/\r?\n/)

    const out: string[] = []
    out.push(['kanji', 'mean', 'detail', 'kun', 'on', 'jlpt', 'strokes'].join('\t'))

    for (const line of lines) {
        if (!line || line.startsWith('#')) continue // skip metadata/empty
        const cols = line.split('\t')
        if (cols.length < 7) continue // need at least up to meaning

        const kanji = (cols[1] || '').trim()
        const on = cleanReading(cols[3])
        const kun = cleanReading(cols[4])
        const mean = (cols[6] || '').trim()
        const tags = cols[23] || ''
        const jlpt = parseJlptFromTags(tags)
        // Keep ONLY JLPT N3, N4, N5; drop everything else (including missing JLPT)
        if (!(jlpt === '3' || jlpt === '4' || jlpt === '5')) {
            continue
        }
        // Heuristic to detect stroke count window in columns (seen pattern: number, single CJK, number)
        let strokes = ''
        for (let i = 7; i < cols.length - 2; i++) {
            const a = (cols[i] || '').trim()
            const b = (cols[i + 1] || '').trim()
            const c = (cols[i + 2] || '').trim()
            if (/^\d{1,2}$/.test(a) && b.length === 1 && /[\u2E80-\u9FFF]/.test(b) && /^\d{1,3}$/.test(c)) {
                strokes = a
                break
            }
        }

        if (!kanji) continue

        out.push([kanji, mean, '', kun, on, jlpt, strokes].join('\t'))
    }

    fs.writeFileSync(outputPath, out.join('\n'), 'utf8')
    console.log(`Cleaned file written: ${outputPath} (${out.length - 1} rows)`) // exclude header
}

main()


