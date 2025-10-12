import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetAllSequences() {
  try {
    console.log('🔄 Starting sequence reset for all tables...')

    // SQL script để reset tất cả sequences - Fixed version
    const resetSequencesSQL = `
DO
$$
    DECLARE
        seq_record RECORD;
    BEGIN
        -- Lấy tất cả sequences và table tương ứng
        FOR seq_record IN
            SELECT 
                s.sequence_name,
                REPLACE(s.sequence_name::text, '_id_seq', '') as table_name
            FROM information_schema.sequences s
            WHERE s.sequence_schema = 'public'
              AND s.sequence_name LIKE '%_id_seq'
        LOOP
            EXECUTE format(
                'SELECT setval(''%I'', COALESCE((SELECT MAX(id) FROM %I), 1))',
                seq_record.sequence_name,
                seq_record.table_name
            );
            
            RAISE NOTICE 'Reset sequence % for table %', seq_record.sequence_name, seq_record.table_name;
        END LOOP;
    END
$$;
`

    // Thực thi raw SQL
    await prisma.$executeRawUnsafe(resetSequencesSQL)

    console.log('✅ Successfully reset all sequences!')

    // Hiển thị thông tin sequence hiện tại
    const sequenceInfo = await prisma.$queryRawUnsafe(`
      SELECT
        schemaname,
        sequencename,
        last_value
      FROM pg_sequences
      WHERE schemaname = 'public'
      ORDER BY sequencename;
    `)

    console.log('\n📊 Current sequence values:')
    console.table(sequenceInfo)
  } catch (error) {
    console.error('❌ Error resetting sequences:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  resetAllSequences()
    .then(() => {
      console.log('🎉 Sequence reset completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Sequence reset failed:', error)
      process.exit(1)
    })
}

export default resetAllSequences
