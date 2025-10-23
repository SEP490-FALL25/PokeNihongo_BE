import fs from 'fs'
import path from 'path'

/*
  Clean "Từ vựng tiếng Nhật.txt" (tab-separated, Anki export style)

  Observed columns:
    0: Deck/Category (e.g., "Từ vựng tiếng Nhật::Chủ đề::Ẩm thực")
    1: Vietnamese meaning (e.g., "cơm cá ngừ sốt mè")
    2: Japanese word/phrase (Kanji/Kana) (e.g., "鉄火丼")
    3+: Optional/various (POS, tags, notes) – often empty

  Output TSV columns (Category removed as requested):
    word    reading    meaning    example_jp    example_vi    jlpt    word_type    word_type_vi

  Rules:
    - Skip metadata lines starting with '#'
    - "word" is the Japanese term from column 2
    - "reading": if missing/unknown, duplicate the Japanese term (frontend expects a value)
    - "meaning" is Vietnamese from column 1
    - "example_jp" and "example_vi" left empty (source is inconsistent)
    - Bỏ các chủ đề (Ẩm thực, Cơ thể, ...). Chỉ giữ phân loại JLPT như clear-kanji.
    - Parse JLPT từ cột category (mẫu: "...::JLPT::N5"). Giữ N3/N4/N5, bỏ các mục khác.
    - Không xuất Category; chỉ lọc theo JLPT (N3/N4/N5) từ category gốc.
*/

function main() {
    const root = process.cwd()
    const inputPath = path.resolve(root, 'Từ vựng tiếng Nhật.txt')
    const outputPath = path.resolve(root, 'vocabulary-clean.txt')

    if (!fs.existsSync(inputPath)) {
        console.error('Input file not found:', inputPath)
        process.exit(1)
    }

    const raw = fs.readFileSync(inputPath, 'utf8')
    const lines = raw.split(/\r?\n/)

    const out: string[] = []
    out.push(['word', 'reading', 'meaning', 'example_jp', 'example_vi', 'jlpt', 'word_type'].join('\t'))

    for (const line of lines) {
        if (!line || line.startsWith('#')) continue
        const cols = line.split('\t')
        if (cols.length < 3) continue

        const categoryRaw = (cols[0] || '').trim()
        let wordJp = (cols[1] || '').trim()       // Cột 1: từ Nhật (có thể có furigana)
        let meaningVi = (cols[2] || '').trim()    // Cột 2: nghĩa tiếng Việt
        let exampleJp = (cols[3] || '').trim()
        let exampleVi = (cols[4] || '').trim()
        const extraCols = cols.slice(5).map(s => (s || '').trim()).filter(Boolean)

        // Loại bỏ số ở đầu (ví dụ: "1確か" → "確か", "2冷たい" → "冷たい")
        meaningVi = meaningVi.replace(/^[0-9]+/, '')
        wordJp = wordJp.replace(/^[0-9]+/, '')

        if (!wordJp || !meaningVi) continue

        // Detect rows where JP/VI are swapped and fix
        const isJapanese = (text: string): boolean => {
            if (!text) return false
            const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\uF900-\uFAFF\u2F800-\u2FA1F]/
            return japaneseRegex.test(text)
        }
        const isVietnamese = (text: string): boolean => {
            if (!text) return false
            // Broad detection: presence of Vietnamese diacritics or the letter đ/Đ
            const vietnameseRegex = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴđĐ]/
            return vietnameseRegex.test(text)
        }


        // Case 1: Right is Japanese but left is not -> swap
        if (!isJapanese(wordJp) && isJapanese(meaningVi)) {
            const tmp = wordJp
            wordJp = meaningVi
            meaningVi = tmp
        }
        // Case 2: wordJp looks Vietnamese while meaning does not -> swap
        else if (isVietnamese(wordJp) && !isVietnamese(meaningVi)) {
            const tmp = wordJp
            wordJp = meaningVi
            meaningVi = tmp
        }

        // Parse JLPT level from category like "...::JLPT::N5"
        const jlptMatch = categoryRaw.match(/JLPT::N([1-5])/i)
        const jlpt = jlptMatch ? jlptMatch[1] : ''
        // Keep only N3, N4, N5 similar to clear-kanji behavior
        if (!(jlpt === '3' || jlpt === '4' || jlpt === '5')) {
            continue
        }

        // Extract surface (kanji) and reading from bracketed furigana pattern: [漢[かん]]字 -> 漢字 / かんじ
        const parseFurigana = (text: string): { surface: string; reading: string } => {
            if (!text) return { surface: '', reading: '' }
            // Loại bỏ [số] trước khi parse (ví dụ: [1][起[お]]こる → [起[お]]こる)
            text = text.replace(/\[[0-9]+\]/g, '')
            let surface = text.replace(/\[([^\[\]]+?)\[(.*?)\]\]/g, '$1')
            let reading = text.replace(/\[([^\[\]]+?)\[(.*?)\]\]/g, '$2')
            // Remove any leftover brackets
            surface = surface.replace(/[\[\]]/g, '')
            reading = reading.replace(/[\[\]]/g, '')
            // Loại bỏ số ở đầu nếu còn sót
            surface = surface.replace(/^[0-9]+/, '').trim()
            reading = reading.replace(/^[0-9]+/, '').trim()
            return { surface: surface.trim(), reading: reading.trim() }
        }

        // Extract reading from furigana if present
        let extractedReading = ''
        if (/[\[\]]/.test(wordJp)) {
            // Xử lý case có nhiều từ cách nhau bởi khoảng trắng: "[引[ひ]]く 弾く" → "引く・弾く" / "ひく"
            const parts = wordJp.split(/\s+/)
            const surfaceParts: string[] = []
            const readingParts: string[] = []

            for (const part of parts) {
                if (/[\[\]]/.test(part)) {
                    const { surface, reading: ruby } = parseFurigana(part)
                    if (surface) surfaceParts.push(surface)
                    if (ruby && isJapanese(ruby)) readingParts.push(ruby)
                } else {
                    // Phần không có furigana, giữ nguyên
                    surfaceParts.push(part)
                }
            }

            wordJp = surfaceParts.join('・') // Nối bằng ・
            extractedReading = readingParts.length > 0 ? readingParts[0] : '' // Chỉ lấy reading đầu tiên
        }

        // Fix misordered examples if needed: if exampleVi looks Japanese but exampleJp does not
        if (!isJapanese(exampleJp) && isJapanese(exampleVi)) {
            const t = exampleJp
            exampleJp = exampleVi
            exampleVi = t
        }

        // Compute reading: prefer extractedReading from furigana; else fallback to wordJp
        let reading = extractedReading || wordJp

        // Detect POS in extra columns and map to word_type
        const joined = extraCols.join(' ')
        const has = (re: RegExp) => re.test(joined)
        const POS = {
            noun: /名詞/,
            ichidan: /一段動詞/,
            godan: /五段動詞/,
            transitive: /他動詞/,
            intransitive: /自動詞/,
            iAdj: /形容詞/,
            naAdj: /形容動詞/,
            adverb: /副詞/,
            particle: /助詞/
        }
        let wordType = ''
        if (has(POS.ichidan)) wordType = 'ichidan_verb'
        else if (has(POS.godan)) wordType = 'godan_verb'
        else if (has(POS.transitive)) wordType = 'transitive_verb'
        else if (has(POS.intransitive)) wordType = 'intransitive_verb'
        else if (has(POS.iAdj)) wordType = 'i_adjective'
        else if (has(POS.naAdj)) wordType = 'na_adjective'
        else if (has(POS.adverb)) wordType = 'adverb'
        else if (has(POS.particle)) wordType = 'particle'
        else if (has(POS.noun)) wordType = 'noun'

        // Fallback: nếu chưa xác định được wordType, đoán dựa vào cấu trúc
        if (!wordType) {
            // Nếu kết thúc bằng る → godan verb (mặc định)
            if (/[うくぐすつぬぶむゆる]$/.test(wordJp)) {
                wordType = 'godan_verb'
            }
            // Nếu kết thúc bằng い → có thể là tính từ i
            else if (/い$/.test(wordJp) && wordJp.length > 1) {
                wordType = 'i_adjective'
            }
            // Mặc định coi là danh từ
            else {
                wordType = 'noun'
            }
        }

        out.push([wordJp, reading, meaningVi, exampleJp, exampleVi, jlpt, wordType].join('\t'))
    }

    fs.writeFileSync(outputPath, out.join('\n'), 'utf8')
    console.log(`Cleaned file written: ${outputPath} (${out.length - 1} rows)`) // exclude header
}

main()


