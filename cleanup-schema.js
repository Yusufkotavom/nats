const fs = require('fs');
const path = require('path');

const schemaDir = path.join(__dirname, 'prisma/schema');
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.prisma'));

for (const file of files) {
    const filePath = path.join(schemaDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Strip relation fields like: user User @relation(...)
    // Note: we can't just strip 'user' or 'role' fields blindly because they might be scalars or something else.
    // We look for patterns like 'someField  User  @relation(...)'
    // We also look for 'users User[]' or 'createdOrders Order[]' inside User model but we're going to delete User model entirely below anyway.

    content = content.replace(/^[ \t]*[a-zA-Z0-9_]+\s+User\??\s+@relation.*$/gm, '');
    content = content.replace(/^[ \t]*[a-zA-Z0-9_]+\s+Role\??\s+@relation.*$/gm, '');

    content = content.replace(/^[ \t]*[a-zA-Z0-9_]+\s+User\[\](\s+@relation.*)?$/gm, '');
    content = content.replace(/^[ \t]*[a-zA-Z0-9_]+\s+Role\[\](\s+@relation.*)?$/gm, '');

    if (file === '01_general.prisma') {
        // We must manually remove the entire model User and model Role.
        // A quick regex to remove a block starting with 'model User {' and ending with '}'
        content = content.replace(/model User \{[\s\S]*?\n\}/g, '');
        content = content.replace(/model Role \{[\s\S]*?\n\}/g, '');
    }

    // Also remove cross-db relation indexes if they refer strictly to the removed fields?
    // They are usually @@index([userId]) which is fine because we keep userId String!
    // Same for roleId String. We MUST make sure roleId and userId are still there.

    // Let's write it back
    fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Finished stripping relations from tenant schemas.');
