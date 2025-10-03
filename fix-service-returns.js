const fs = require('fs');

// Fix service return patterns for ZodSerializerDto compatibility
function fixServiceReturns(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Pattern 1: Fix return statements that wrap data in { data: result, message: 'success' }
        content = content.replace(
            /return\s*\{\s*data:\s*([^,]+),\s*message:\s*['"][^'"]*['"]\s*\};/g,
            'return $1;'
        );
        
        // Pattern 2: Fix return statements with data and message properties
        content = content.replace(
            /return\s*\{\s*data:\s*([^,]+),\s*message:\s*['"][^'"]*['"]\s*\}/g,
            'return $1'
        );
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed ${filePath}`);
        return true;
    } catch (error) {
        console.log(`❌ Error fixing ${filePath}:`, error.message);
        return false;
    }
}

// Fix all service files
const services = [
    'src/modules/kanji/kanji.service.ts',
    'src/modules/kanji-reading/kanji-reading.service.ts',
    'src/modules/meaning/meaning.service.ts',
    'src/modules/translation/translation.service.ts',
    'src/modules/wordtype/wordtype.service.ts'
];

let fixed = 0;
services.forEach(service => {
    if (fs.existsSync(service)) {
        if (fixServiceReturns(service)) {
            fixed++;
        }
    } else {
        console.log(`❌ File not found: ${service}`);
    }
});

console.log(`🎉 Fixed ${fixed}/${services.length} services!`);

