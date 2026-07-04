const fs = require('fs');
let content = fs.readFileSync('e:/HivebyTailorBee/HivebyTailorBee/convex/boutiques.ts', 'utf8');

// Replace all occurrences where v.optional(v.union(...)) misses the inner closing parenthesis
content = content.replace(/v\.literal\("multi_category"\)\s*\n\s*\),/g, 'v.literal("multi_category")\n                        )\n                      ),');
content = content.replace(/v\.literal\("multi_brand_store"\)\s*\n\s*\),/g, 'v.literal("multi_brand_store")\n                        )\n                      ),');
content = content.replace(/v\.literal\("Elite"\)\s*\n\s*\),/g, 'v.literal("Elite")\n                        )\n                      ),');
content = content.replace(/v\.literal\("custom_design"\)\s*\n\s*\),/g, 'v.literal("custom_design")\n                        )\n                      ),');

fs.writeFileSync('e:/HivebyTailorBee/HivebyTailorBee/convex/boutiques.ts', content, 'utf8');
console.log('Fixed syntax errors in boutiques.ts');
