import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { KanjiService } from '../src/modules/kanji/kanji.service'
import { VocabularyService } from '../src/modules/vocabulary/vocabulary.service'

const main = async () => {
    console.log('🌱 Bắt đầu chạy seed data...')

    const app = await NestFactory.createApplicationContext(AppModule)
    const kanjiService = app.get(KanjiService)
    const vocabularyService = app.get(VocabularyService)

    try {
        // 1. Tạo Kanji N5 cơ bản
        console.log('\n📝 Đang tạo các Kanji N5...')

        const kanjiData = [
            {
                character: '日',
                strokeCount: 4,
                jlptLevel: 5,
                readings: [
                    { readingType: 'onyomi', reading: 'ニチ' },
                    { readingType: 'kunyomi', reading: 'ひ' }
                ],
                meanings: {
                    translations: {
                        vi: 'mặt trời, ngày',
                        en: 'sun, day'
                    }
                }
            },
            {
                character: '本',
                strokeCount: 5,
                jlptLevel: 5,
                readings: [
                    { readingType: 'onyomi', reading: 'ホン' },
                    { readingType: 'kunyomi', reading: 'もと' }
                ],
                meanings: {
                    translations: {
                        vi: 'gốc, sách',
                        en: 'origin, book'
                    }
                }
            },
            {
                character: '語',
                strokeCount: 14,
                jlptLevel: 5,
                readings: [
                    { readingType: 'onyomi', reading: 'ゴ' },
                    { readingType: 'kunyomi', reading: 'かた.る' }
                ],
                meanings: {
                    translations: {
                        vi: 'ngôn ngữ, nói',
                        en: 'language, speak'
                    }
                }
            }
        ]

        for (const kanji of kanjiData) {
            try {
                await kanjiService.createWithMeanings(kanji)
                console.log(`✅ Tạo Kanji: ${kanji.character}`)
            } catch (error) {
                console.log(`⚠️  Kanji ${kanji.character} có thể đã tồn tại`)
            }
        }

        console.log('✅ Hoàn thành tạo Kanji N5!')

        // 2. Tạo từ vựng bài 1 Minna no Nihongo
        console.log('\n📚 Đang tạo từ vựng bài 1...')

        const vocabularyData = [
            {
                word_jp: 'こんにちは',
                reading: 'こんにちは',
                level_n: 5,
                word_type_id: 1, // Assuming greeting word type
                translations: {
                    meaning: [
                        { language_code: 'vi', value: 'Xin chào' },
                        { language_code: 'en', value: 'Hello' }
                    ]
                }
            },
            {
                word_jp: 'ありがとう',
                reading: 'ありがとう',
                level_n: 5,
                word_type_id: 1,
                translations: {
                    meaning: [
                        { language_code: 'vi', value: 'Cảm ơn' },
                        { language_code: 'en', value: 'Thank you' }
                    ]
                }
            }
        ]

        for (const vocab of vocabularyData) {
            try {
                await vocabularyService.createFullVocabularyWithFiles(vocab)
                console.log(`✅ Tạo từ vựng: ${vocab.word_jp}`)
            } catch (error) {
                console.log(`⚠️  Từ vựng ${vocab.word_jp} có thể đã tồn tại`)
            }
        }

        console.log('✅ Hoàn thành tạo từ vựng bài 1!')
        console.log('\n🎉 Hoàn thành seed data!')

    } catch (error) {
        console.error('❌ Lỗi khi chạy seed data:', error)
    } finally {
        await app.close()
    }
}

main().catch(console.error)
