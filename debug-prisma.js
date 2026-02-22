const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const projectRoot = __dirname;
const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
const generatedSchemaPath = path.join(projectRoot, 'node_modules', '.prisma', 'client', 'schema.prisma');

console.log('🔍 Debugging Prisma Generation...');

// 1. Check Source Schema
console.log(`\n📄 Checking source schema: ${schemaPath}`);
if (fs.existsSync(schemaPath)) {
    const content = fs.readFileSync(schemaPath, 'utf8');
    const providerMatch = content.match(/provider\s*=\s*"(.*?)"/);
    const urlMatch = content.match(/url\s*=\s*(.*)/);
    console.log(`   Provider: ${providerMatch ? providerMatch[1] : 'NOT FOUND'}`);
    console.log(`   URL: ${urlMatch ? urlMatch[1] : 'NOT FOUND'}`);

    if (!content.includes('postgresql')) {
        console.error('❌ SOURCE SCHEMA IS NOT POSTGRESQL!');
    } else {
        console.log('✅ Source schema looks correct (postgresql)');
    }
} else {
    console.error('❌ Source schema file not found!');
    process.exit(1);
}

// 2. Delete Generated Client
console.log('\n🗑️  Deleting node_modules/.prisma...');
const generatedDir = path.join(projectRoot, 'node_modules', '.prisma');
if (fs.existsSync(generatedDir)) {
    fs.rmSync(generatedDir, { recursive: true, force: true });
    console.log('   Deleted.');
} else {
    console.log('   Already missing.');
}

// 3. Run Prisma Generate
console.log('\n⚙️  Running prisma generate...');
try {
    execSync('npx prisma generate', { stdio: 'inherit', cwd: projectRoot });
    console.log('✅ Generation command finished.');
} catch (e) {
    console.error('❌ Generation failed:', e.message);
}

// 4. Check Generated Result
console.log(`\n📄 Checking generated schema: ${generatedSchemaPath}`);
if (fs.existsSync(generatedSchemaPath)) {
    const content = fs.readFileSync(generatedSchemaPath, 'utf8');
    const providerMatch = content.match(/provider\s*=\s*"(.*?)"/);
    const urlMatch = content.match(/url\s*=\s*(.*)/);
    console.log(`   Provider: ${providerMatch ? providerMatch[1] : 'NOT FOUND'}`);
    console.log(`   URL: ${urlMatch ? urlMatch[1] : 'NOT FOUND'}`);

    if (content.includes('postgresql')) {
        console.log('🎉 SUCCESS! Generated client is PostgreSQL.');
    } else {
        console.error('❌ GENERATED CLIENT IS STILL ' + (providerMatch ? providerMatch[1] : 'UNKNOWN') + '!');
    }
} else {
    console.error('❌ Generated schema file not found!');
}
