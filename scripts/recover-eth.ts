import { ethers } from 'ethers';
import { EVM_NETWORK_CONFIG } from '../config/constants';
import dotenv from 'dotenv';

dotenv.config();

async function recoverETH() {
    const provider = new ethers.JsonRpcProvider(EVM_NETWORK_CONFIG.ARBITRUM.PROVIDER);
    const wallet = new ethers.Wallet(process.env.EVM_TEST_PRIV_KEY!, provider);
    
    // The contract that received our ETH
    const contractAddress = "0x6966C135D8D105CC172Ac0be55D418C8247243dE";
    
    try {
        // Try to withdraw the ETH
        const tx = await wallet.sendTransaction({
            to: contractAddress,
            data: ethers.id("withdraw()").slice(0, 10), // Function selector for withdraw()
            gasLimit: 100000
        });
        
        console.log("Recovery transaction sent:", tx.hash);
        await tx.wait();
        console.log("ETH recovered!");
    } catch (error) {
        console.error("Failed to recover ETH:", error);
    }
}

recoverETH().catch(console.error); 