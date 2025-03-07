import * as fs from 'fs';
import * as path from 'path';

function isValidABI(abi: any): boolean {
    if (!Array.isArray(abi)) return false;
    return abi.every(item => 
        typeof item === 'object' && 
        item !== null && 
        ('type' in item) && 
        typeof item.type === 'string'
    );
}

function processArtifacts() {
    const outDir = path.join(__dirname, '../out');
    const typeChainDir = path.join(__dirname, '../typechain-out');

    // Create typechain output directory if it doesn't exist
    if (!fs.existsSync(typeChainDir)) {
        fs.mkdirSync(typeChainDir, { recursive: true });
    }
    
    function processDirectory(dir: string) {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                processDirectory(fullPath);
            } else if (item.endsWith('.json') && 
                      !item.endsWith('.metadata.json') && 
                      !item.endsWith('.abi.json') &&
                      !item.includes('build-info')) {
                try {
                    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                    
                    // Check if this is a Foundry artifact with valid ABI
                    if (content.abi && isValidABI(content.abi)) {
                        const processed = {
                            contractName: path.basename(item, '.json'),
                            abi: content.abi,
                            bytecode: content.bytecode?.object || content.bytecode || content.bin || "0x"
                        };
                        
                        // Create relative directory structure in typechain-out
                        const relativePath = path.relative(outDir, path.dirname(fullPath));
                        const targetDir = path.join(typeChainDir, relativePath);
                        if (!fs.existsSync(targetDir)) {
                            fs.mkdirSync(targetDir, { recursive: true });
                        }

                        // Write to new location
                        const targetPath = path.join(targetDir, item);
                        fs.writeFileSync(targetPath, JSON.stringify(processed, null, 2));
                        console.log(`Processed: ${targetPath}`);
                    } else {
                        console.warn(`Skipping ${fullPath}: Invalid or missing ABI`);
                    }
                } catch (error) {
                    console.error(`Error processing ${fullPath}:`, error);
                }
            }
        });
    }
    
    processDirectory(outDir);
}

processArtifacts();
