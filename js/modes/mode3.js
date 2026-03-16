// js/modes/mode3.js
import { Utils } from '../utils.js';

export const mode3 = {
    id: 'mode3',
    name: 'MODE 3 (Tách phiên bản trong ◤ ◥)',
    execute: (cleanedText, inputs) => {
        const products = [];
        
        // 1. Lấy cụm "价格" làm ghi chú chung
        let globalPriceNote = "";
        const jgKey = "价格";
        const jgIdx = cleanedText.indexOf(jgKey);
        if (jgIdx !== -1) {
            const afterJg = cleanedText.substring(jgIdx + jgKey.length).trim();
            const endNoteIdx = afterJg.indexOf("\n\n");
            globalPriceNote = endNoteIdx !== -1 ? afterJg.substring(0, endNoteIdx).trim() : afterJg.split('\n')[0].trim();
        }

        // Hàm bổ trợ: Tìm giá thấp nhất trong một chuỗi bất kỳ
        const findMinPriceInString = (text) => {
            const priceRegex = /¥\s*([\d.,]+)/g;
            let match;
            let min = Infinity;
            while ((match = priceRegex.exec(text)) !== null) {
                const num = parseFloat(match[1].replace(/,/g, '.'));
                if (!isNaN(num) && num < min) min = num;
            }
            return min;
        };

        // 2. Tách sản phẩm theo Link ảnh
        const parts = cleanedText.split(/(?=https?:\/\/)/).filter(p => p.trim() !== "");

        parts.forEach(part => {
            const lines = part.trim().split('\n').map(l => l.trim()).filter(l => l !== "");
            
            if (lines.length >= 3 && lines[0].startsWith('http') && !lines[0].includes('detail.1688.com')) {
                const imgLink = lines[0];
                const mainName = lines[1];
                let dirtyPriceLine = lines[2]; 

                // --- Xử lý dấu hiệu ◤ ◥ ---
                const bracketMatch = dirtyPriceLine.match(/◤([\s\S]*?)◥/);
                let contentInBrackets = "";
                if (bracketMatch) {
                    contentInBrackets = bracketMatch[1].trim();
                    dirtyPriceLine = contentInBrackets; // Ưu tiên nội dung trong ngoặc
                }

                // 3. Tách biến thể dựa trên dấu ¥
                const variantRegex = /[^¥\n]+?¥\s*[\d.,]+/g;
                const matches = dirtyPriceLine.match(variantRegex) || [];
                
                let minPrice = Infinity;
                let processedVariants = [];

                // ĐẾM SỐ LƯỢNG KÝ TỰ ¥ TRONG NỘI DUNG
                const symbolCount = (dirtyPriceLine.match(/¥/g) || []).length;

                if (matches.length > 0) {
                    matches.forEach(item => {
                        const variantText = item.trim();
                        processedVariants.push(variantText);

                        const priceMatch = variantText.match(/¥\s*([\d.,]+)/);
                        if (priceMatch) {
                            const num = parseFloat(priceMatch[1].replace(/,/g, '.'));
                            if (!isNaN(num) && num < minPrice) {
                                minPrice = num;
                            }
                        }
                    });
                } else {
                    const singlePrice = findMinPriceInString(dirtyPriceLine);
                    if (singlePrice !== Infinity) minPrice = singlePrice;
                    processedVariants.push(dirtyPriceLine);
                }

                // --- LOGIC NGOẠI LỆ MỚI ---
                // Nếu chỉ có 1 cụm thông tin sản phẩm VÀ (chỉ có 1 ký tự ¥ HOẶC không tìm thấy giá)
                if (parts.length === 1 && symbolCount <= 1 && globalPriceNote) {
                    const minInGlobal = findMinPriceInString(globalPriceNote);
                    if (minInGlobal !== Infinity) {
                        // Ưu tiên giá thấp nhất từ cụm "价格"
                        minPrice = minInGlobal;
                    }
                }

                products.push({
                    image: Utils.cleanImageUrl(imgLink),
                    name: mainName,
                    price: minPrice === Infinity ? (inputs.defaultPrice || 0) : minPrice, 
                    note: (globalPriceNote ? globalPriceNote + "\n" : "") + processedVariants.join('\n')
                });
            }
        });

        return products;
    }
};